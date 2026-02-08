export interface PaginatedResponse<T> {
  items?: T[];
  players?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
