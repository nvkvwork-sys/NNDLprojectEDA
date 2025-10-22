// components/SentimentAnalysis.tsx
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

interface Message {
  text: string;
  sentiment: string;
}

interface WordStats {
  word: string;
  positive: number;
  negative: number;
  total: number;
}

interface SentimentStats {
  positiveCount: number;
  negativeCount: number;
  avgLengthPositive: number;
  avgLengthNegative: number;
  topWords: WordStats[];
}

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444'
};

export default function SentimentAnalysis() {
  const [data, setData] = useState<Message[]>([]);
  const [filteredData, setFilteredData] = useState<Message[]>([]);
  const [stats, setStats] = useState<SentimentStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния для фильтров
  const [wordFilter, setWordFilter] = useState('');
  const [minWordLength, setMinWordLength] = useState(3);
  const [appliedWordFilter, setAppliedWordFilter] = useState('');
  const [appliedMinWordLength, setAppliedMinWordLength] = useState(3);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      applyFilters();
    }
  }, [data, appliedWordFilter, appliedMinWordLength]);

  const loadData = async () => {
    try {
      const response = await fetch('IMDBDataset.csv');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const parsedData = results.data
            .filter((row: any) => row.review && row.sentiment)
            .map((row: any) => ({
              text: row.review.toString().toLowerCase(),
              sentiment: row.sentiment.toString().toLowerCase()
            }));
          
          setData(parsedData);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...data];

    // Фильтр по слову
    if (appliedWordFilter.trim()) {
      filtered = filtered.filter(msg => 
        msg.text.includes(appliedWordFilter.toLowerCase())
      );
    }

    setFilteredData(filtered);
    analyzeSentiment(filtered);
  };

  const handleApplyFilters = () => {
    setAppliedWordFilter(wordFilter);
    setAppliedMinWordLength(minWordLength);
  };

  const analyzeSentiment = (messages: Message[]) => {
    // Подсчет количества сообщений по тональности
    const positiveMessages = messages.filter(msg => msg.sentiment === 'positive');
    const negativeMessages = messages.filter(msg => msg.sentiment === 'negative');
    
    // Средняя длина сообщений
    const avgLengthPositive = positiveMessages.length > 0 
      ? positiveMessages.reduce((sum, msg) => sum + msg.text.length, 0) / positiveMessages.length 
      : 0;
    
    const avgLengthNegative = negativeMessages.length > 0 
      ? negativeMessages.reduce((sum, msg) => sum + msg.text.length, 0) / negativeMessages.length 
      : 0;

    // Анализ популярных слов
    const wordFrequency: { [key: string]: WordStats } = {};
    
    messages.forEach(message => {
      // Очистка текста и разбиение на слова
      const words = message.text
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length >= appliedMinWordLength);

      words.forEach(word => {
        if (!wordFrequency[word]) {
          wordFrequency[word] = {
            word,
            positive: 0,
            negative: 0,
            total: 0
          };
        }

        if (message.sentiment === 'positive') {
          wordFrequency[word].positive++;
        } else {
          wordFrequency[word].negative++;
        }
        
        wordFrequency[word].total++;
      });
    });

    // Топ 20 самых популярных слов
    const topWords = Object.values(wordFrequency)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    setStats({
      positiveCount: positiveMessages.length,
      negativeCount: negativeMessages.length,
      avgLengthPositive,
      avgLengthNegative,
      topWords
    });
  };

  const handleWordFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWordFilter(e.target.value);
  };

  const handleMinWordLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMinWordLength(Number(e.target.value));
  };

  const clearFilters = () => {
    setWordFilter('');
    setMinWordLength(3);
    setAppliedWordFilter('');
    setAppliedMinWordLength(3);
  };

  const hasActiveFilters = appliedWordFilter || appliedMinWordLength !== 3;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-black">Загрузка данных...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-red-500">Ошибка загрузки данных</div>
      </div>
    );
  }

  // Данные для графиков
  const sentimentDistribution = [
    { name: 'Positive', value: stats.positiveCount, color: COLORS.positive },
    { name: 'Negative', value: stats.negativeCount, color: COLORS.negative }
  ];

  const avgLengthData = [
    { name: 'Positive', length: Math.round(stats.avgLengthPositive), color: COLORS.positive },
    { name: 'Negative', length: Math.round(stats.avgLengthNegative), color: COLORS.negative }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">Анализ тональности сообщений</h1>
      
      {/* Фильтры */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4 text-black">Фильтры</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Фильтр по слову:
            </label>
            <input
              type="text"
              value={wordFilter}
              onChange={handleWordFilterChange}
              placeholder="Введите слово для фильтрации..."
              className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Минимальная длина слова:
            </label>
            <select
              value={minWordLength}
              onChange={handleMinWordLengthChange}
              className="w-full p-2 border border-gray-300 rounded-md text-black bg-white"
            >
              <option value={2}>2 символа</option>
              <option value={3}>3 символа</option>
              <option value={4}>4 символа</option>
              <option value={5}>5 символов</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilters}
              className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Применить фильтры
            </button>
            <button
              onClick={clearFilters}
              className="w-full p-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
        
        {/* Информация о примененных фильтрах */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="font-semibold text-black mb-2">Примененные фильтры:</h4>
            <div className="flex flex-wrap gap-4 text-black">
              {appliedWordFilter && (
                <span className="bg-blue-100 px-2 py-1 rounded">
                  Слово: <strong>"{appliedWordFilter}"</strong>
                </span>
              )}
              {appliedMinWordLength !== 3 && (
                <span className="bg-blue-100 px-2 py-1 rounded">
                  Мин. длина слова: <strong>{appliedMinWordLength}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Индикатор изменений в фильтрах */}
        {(wordFilter !== appliedWordFilter || minWordLength !== appliedMinWordLength) && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              ⚠ Фильтры изменены. Нажмите "Применить фильтры" для обновления результатов.
            </p>
          </div>
        )}
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-black">Всего сообщений</h3>
          <p className="text-2xl font-bold text-black">{filteredData.length}</p>
          <p className="text-sm text-gray-600 mt-1">из {data.length} всего</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-black">Позитивных</h3>
          <p className="text-2xl font-bold text-green-600">{stats.positiveCount}</p>
          <p className="text-sm text-gray-600 mt-1">
            {filteredData.length > 0 ? ((stats.positiveCount / filteredData.length) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2 text-black">Негативных</h3>
          <p className="text-2xl font-bold text-red-600">{stats.negativeCount}</p>
          <p className="text-sm text-gray-600 mt-1">
            {filteredData.length > 0 ? ((stats.negativeCount / filteredData.length) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Распределение тональности */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-black">Распределение тональности</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sentimentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Средняя длина сообщений */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-black">Средняя длина сообщений</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgLengthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="length">
                {avgLengthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Популярные слова */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-black">Топ 20 популярных слов по тональности</h3>
        <div className="mb-4 text-black">
          <p>Минимальная длина слова: {appliedMinWordLength} символа</p>
          {appliedWordFilter && <p>Фильтр по слову: "{appliedWordFilter}"</p>}
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={stats.topWords}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="word" 
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="positive" name="Positive" fill={COLORS.positive} stackId="a" />
            <Bar dataKey="negative" name="Negative" fill={COLORS.negative} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}