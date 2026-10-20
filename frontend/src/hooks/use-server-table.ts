"use client";
import { useCallback, useEffect, useState } from "react";

export type TableQuery = {
  page: number;
  pageSize: number;
  search: string;
  filters: Record<string, string>;
  sort: string | null;
  dir: "asc" | "desc";
};

export type ServerTable<T> = {
  total: number;
  loading: boolean;
  onQueryChange: (query: TableQuery) => void;
  fetchAll: () => Promise<T[]>;
};

type FilterOption = { value: string; label: string };

const firstPage: TableQuery = { page: 0, pageSize: 10, search: "", filters: {}, sort: null, dir: "asc" };

const matchParams = (query: TableQuery) => {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  for (const [key, value] of Object.entries(query.filters)) if (value !== "all") params.set(key, value);
  if (query.sort) {
    params.set("sort", query.sort);
    params.set("dir", query.dir);
  }
  return params;
};

const pageParams = (query: TableQuery) => {
  const params = matchParams(query);
  params.set("page", String(query.page + 1));
  params.set("pageSize", String(query.pageSize));
  return params.toString();
};

const getJson = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
};

/** One page at a time from `url`: `?page=` answers `{ rows, total }`, no page answers every match, `/filters` the filter options. */
export function useServerTable<T>(url: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [query, setQuery] = useState(firstPage);
  const [version, setVersion] = useState(0);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const requestKey = `${pageParams(query)}#${version}`;

  useEffect(() => {
    const controller = new AbortController();
    getJson(`${url}?${pageParams(query)}`, { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data.rows)) throw new Error(`${url} did not return a page`);
        setRows(data.rows);
        setTotal(data.total);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error(`Error fetching ${url}:`, error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledKey(requestKey);
      });
    return () => controller.abort();
  }, [url, query, requestKey]);

  const loading = settledKey !== requestKey;
  const loaded = settledKey !== null;

  useEffect(() => {
    getJson(`${url}/filters`)
      .then(setFilterOptions)
      .catch((error) => console.error(`Error fetching ${url}/filters:`, error));
  }, [url, version]);

  const onQueryChange = useCallback((next: TableQuery) => {
    setQuery((prev) => (pageParams(prev) === pageParams(next) ? prev : next));
  }, []);

  const fetchAll = useCallback((): Promise<T[]> => getJson(`${url}?${matchParams(query)}`), [url, query]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { rows, setRows, total, loading, loaded, filterOptions, onQueryChange, fetchAll, refresh };
}

export type ServerTableState<T> = ReturnType<typeof useServerTable<T>>;
