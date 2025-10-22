#!/usr/bin/env python3
"""
Lightweight EDA generator for the IMDB dataset using only Python standard library.

Reads IMDB reviews CSV with columns: review,sentiment
Outputs JSON files in a target directory for a static site to visualize.

Generated files:
- summary.json: basic counts and length stats
- top_words.json: top unigrams by frequency (overall/positive/negative)
- bigrams.json: top bigrams by frequency (overall/positive/negative)
- log_odds.json: per-class most distinctive words by log-odds ratio

Usage:
  python3 src/generate_eda.py --input "IMDB Dataset.csv" --outdir docs/assets --top_k 50
"""

import argparse
import csv
import json
import math
import os
import re
from collections import Counter, defaultdict
from statistics import mean


DEFAULT_STOPWORDS = {
    # A compact English stopword list. We purposefully keep negations.
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', "it's", 'its', 'itself',
    'just', 'll', 'm', 'ma', 'me', 'more', 'most', 'my', 'myself', 'now', 'o', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're',
    's', 'same', 'she', 'should', "should've", 'so', 'some', 'such', 't', 'than', 'that', "that's",
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
    'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would', 'y',
    'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves'
}

# Keep negations in vocabulary by removing from stopwords
NEGATION_WORDS = {'no', 'not', 'nor', "n't"}
STOPWORDS = (DEFAULT_STOPWORDS - NEGATION_WORDS)


_TAG_RE = re.compile(r"<[^>]+>")
_TOKEN_RE = re.compile(r"[a-zA-Z']+")


def normalize_text(text: str) -> str:
    text = text.replace("<br />", " ")
    text = _TAG_RE.sub(" ", text)
    text = text.lower()
    return text


def tokenize(text: str):
    for match in _TOKEN_RE.finditer(text):
        token = match.group(0)
        if token in STOPWORDS:
            continue
        # Collapse multiple apostrophes and trim leading/trailing
        token = token.strip("'")
        if len(token) < 2:
            continue
        yield token


def iter_bigrams(tokens):
    prev = None
    for t in tokens:
        if prev is not None:
            yield (prev, t)
        prev = t


def log_odds_ratio(pos_count, neg_count, pos_total, neg_total, alpha=0.5):
    """Simple log-odds ratio with add-alpha smoothing.
    Returns log odds for association with positive vs negative.
    Positive => more associated with positive class; negative => more with negative class.
    """
    p = (pos_count + alpha) / (pos_total - pos_count + alpha)
    n = (neg_count + alpha) / (neg_total - neg_count + alpha)
    return math.log(p / n)


def compute_stats(input_path: str, top_k: int = 50):
    n_reviews = 0
    class_counts = Counter()
    length_chars = defaultdict(list)
    length_tokens = defaultdict(list)

    # Token and bigram counts by class
    token_counts = {
        'positive': Counter(),
        'negative': Counter(),
        'overall': Counter(),
    }
    bigram_counts = {
        'positive': Counter(),
        'negative': Counter(),
        'overall': Counter(),
    }

    # Document frequency per token by class (how many reviews contain the token)
    doc_freq = {
        'positive': Counter(),
        'negative': Counter(),
        'overall': Counter(),
    }

    with open(input_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        if 'review' not in reader.fieldnames or 'sentiment' not in reader.fieldnames:
            raise ValueError('CSV must contain columns: review,sentiment')

        for row in reader:
            n_reviews += 1
            sentiment = row['sentiment'].strip().lower()
            if sentiment not in ('positive', 'negative'):
                # Skip unknown labels
                continue

            class_counts[sentiment] += 1
            text = normalize_text(row['review'] or '')
            tokens = list(tokenize(text))
            length_chars[sentiment].append(len(text))
            length_tokens[sentiment].append(len(tokens))

            # Token counts
            token_counts[sentiment].update(tokens)
            token_counts['overall'].update(tokens)

            # Bigram counts
            bigrams = list(iter_bigrams(tokens))
            bigram_counts[sentiment].update(bigrams)
            bigram_counts['overall'].update(bigrams)

            # Document frequency
            seen = set(tokens)
            doc_freq[sentiment].update(seen)
            doc_freq['overall'].update(seen)

    # Aggregate totals
    pos_total_tokens = sum(token_counts['positive'].values())
    neg_total_tokens = sum(token_counts['negative'].values())
    vocab = set(token_counts['overall'].keys())

    # Compute log-odds association for each token
    tokens_assoc = []
    for tok in vocab:
        pc = token_counts['positive'][tok]
        nc = token_counts['negative'][tok]
        lo = log_odds_ratio(pc, nc, pos_total_tokens, neg_total_tokens, alpha=0.5)
        tokens_assoc.append((tok, lo, pc, nc))

    # Sort associations
    tokens_assoc.sort(key=lambda x: x[1], reverse=True)
    assoc_pos = [
        {"term": t, "log_odds": round(lo, 4), "pos_count": pc, "neg_count": nc}
        for t, lo, pc, nc in tokens_assoc[:top_k]
    ]
    assoc_neg = [
        {"term": t, "log_odds": round(lo, 4), "pos_count": pc, "neg_count": nc}
        for t, lo, pc, nc in tokens_assoc[-top_k:]
    ]

    # Prepare top words and bigrams
    def top_counter(counter: Counter, k: int, join_bigram=False):
        items = counter.most_common(k)
        results = []
        for key, count in items:
            if join_bigram and isinstance(key, tuple):
                key = f"{key[0]} {key[1]}"
            results.append({"term": key, "count": count})
        return results

    top_words = {
        'overall': top_counter(token_counts['overall'], top_k),
        'positive': top_counter(token_counts['positive'], top_k),
        'negative': top_counter(token_counts['negative'], top_k),
    }

    top_bigrams = {
        'overall': top_counter(bigram_counts['overall'], top_k, join_bigram=True),
        'positive': top_counter(bigram_counts['positive'], top_k, join_bigram=True),
        'negative': top_counter(bigram_counts['negative'], top_k, join_bigram=True),
    }

    # Summary stats
    def safe_mean(values):
        return float(round(mean(values), 2)) if values else 0.0

    summary = {
        'n_reviews': n_reviews,
        'class_counts': dict(class_counts),
        'avg_length_tokens': {
            'overall': safe_mean(length_tokens['positive'] + length_tokens['negative']),
            'positive': safe_mean(length_tokens['positive']),
            'negative': safe_mean(length_tokens['negative']),
        },
        'avg_length_chars': {
            'overall': safe_mean(length_chars['positive'] + length_chars['negative']),
            'positive': safe_mean(length_chars['positive']),
            'negative': safe_mean(length_chars['negative']),
        },
        'vocab_size': len(vocab),
        'top_k': top_k,
    }

    # Associations payload
    associations = {
        'positive': assoc_pos,
        'negative': assoc_neg,
    }

    return summary, top_words, top_bigrams, associations


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Path to IMDB CSV (review,sentiment)')
    parser.add_argument('--outdir', required=True, help='Directory to write JSON assets')
    parser.add_argument('--top_k', type=int, default=50, help='Top K items to keep')
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    summary, top_words, top_bigrams, associations = compute_stats(args.input, args.top_k)

    with open(os.path.join(args.outdir, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    with open(os.path.join(args.outdir, 'top_words.json'), 'w', encoding='utf-8') as f:
        json.dump(top_words, f, ensure_ascii=False, indent=2)

    with open(os.path.join(args.outdir, 'bigrams.json'), 'w', encoding='utf-8') as f:
        json.dump(top_bigrams, f, ensure_ascii=False, indent=2)

    with open(os.path.join(args.outdir, 'log_odds.json'), 'w', encoding='utf-8') as f:
        json.dump(associations, f, ensure_ascii=False, indent=2)

    print(f"Wrote assets to: {args.outdir}")


if __name__ == '__main__':
    main()


