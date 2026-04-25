// Force commonjs-style load to bypass ESM bundler resolution issues on Vercel
const useSWR = require('swr');

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useBettingMemory() {
    const { data, error } = useSWR('/betting_memory_index.json', fetcher, { refreshInterval: 60000 });
    return {
        memory: data?.matchups || {},
        isLoading: !error && !data,
        error
    };
}