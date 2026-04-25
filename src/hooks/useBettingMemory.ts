import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useBettingMemory() {
    const { data, error } = useSWR('/betting_memory_index.json', fetcher, { refreshInterval: 60000 });
    return {
        memory: data?.matchups || {},
        isLoading: !error && !data,
        error
    };
}