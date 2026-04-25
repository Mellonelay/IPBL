import useSWR from 'swr';

export function useBettingMemory() {
    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const { data, error } = useSWR('/betting_memory_index.json', fetcher, { 
        refreshInterval: 60000,
        revalidateOnFocus: false 
    });
    
    return {
        memory: data?.matchups || {},
        isLoading: !error && !data,
        error
    };
}