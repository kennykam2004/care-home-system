import { useState, useEffect } from 'react';

export function usePagination<T>(data: T[]) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const currentData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    totalCount: data.length
  };
}
