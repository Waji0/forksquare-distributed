import { useState } from 'react';
import { Brain, Loader2, Search, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import axios from 'axios';

interface SimilarResult {
  foodName: string;
  restaurantName: string;
  category: string;
  description: string;
  similarity: number;
}

const suggestedQueries = [
  'spicy chicken rice',
  'sweet chocolate dessert',
  'healthy fresh salad',
  'italian cheese pizza',
  'warm comforting soup',
  'japanese raw fish',
];

export default function SimilarSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SimilarResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(searchQuery: string) {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await axios.get('/api/similar/search', {
        params: { query: searchQuery.trim(), limit: 6 },
      });
      setResults(response.data.data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-purple-600 text-white">
          <Brain className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Vector Similarity Search</h1>
        <p className="mt-2 text-slate-500">
          Powered by <strong>pgvector</strong> — 128-dimensional embeddings with cosine similarity.
          Describe a flavor profile and find matching dishes.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., spicy grilled chicken with smoky flavor"
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {/* Suggested Queries */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {suggestedQueries.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
            >
              <Sparkles className="mr-1 inline h-3 w-3" />
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold text-slate-900">No similar foods found</p>
              <p className="mt-1 text-slate-500">Try a different flavor description.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result, index) => (
                <Card key={`${result.foodName}-${index}`} className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-semibold text-slate-900">{result.foodName}</h3>
                    <Badge
                      className={
                        result.similarity > 0.3
                          ? 'bg-green-50 text-green-700 ring-green-200'
                          : result.similarity > 0.15
                          ? 'bg-yellow-50 text-yellow-700 ring-yellow-200'
                          : 'bg-slate-50 text-slate-600 ring-slate-200'
                      }
                    >
                      {(result.similarity * 100).toFixed(1)}% match
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-600">{result.restaurantName}</p>
                  <p className="mt-1 text-xs text-slate-400">{result.description}</p>

                  <div className="mt-3">
                    <Badge className="bg-purple-50 text-purple-700 ring-purple-200">
                      {result.category}
                    </Badge>
                  </div>

                  {/* Similarity Bar */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-purple-500 transition-all"
                        style={{ width: `${Math.min(100, result.similarity * 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="mx-auto max-w-2xl rounded-2xl bg-slate-100 p-6">
        <h3 className="font-semibold text-slate-900">🧠 How Vector Search Works</h3>
        <ol className="mt-2 space-y-1 text-sm text-slate-600">
          <li>1. Your text query is converted into a 128-dimensional numerical vector (embedding).</li>
          <li>2. The pgvector extension computes <strong>cosine distance</strong> between your vector and all food vectors.</li>
          <li>3. Foods with the smallest distance (highest similarity) are returned.</li>
          <li>4. This is the same technique used by recommendation engines at Netflix, Spotify, and Foodpanda.</li>
        </ol>
      </div>
    </div>
  );
}