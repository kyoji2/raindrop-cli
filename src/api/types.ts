export interface RaindropUser {
  _id: number;
  fullName: string;
  email?: string;
  avatar?: string;
  pro?: boolean;
}

export interface Collection {
  _id: number;
  title: string;
  count: number;
  parent?: { $id: number };
  cover?: string[];
  color?: string;
  view?: 'list' | 'simple' | 'grid' | 'masonry';
  public?: boolean;
  expanded?: boolean;
  lastUpdate?: string;
  created?: string;
  sort?: number;
}

export interface Raindrop {
  _id: number;
  title: string;
  link: string;
  excerpt?: string;
  note?: string;
  type?: 'link' | 'article' | 'image' | 'video' | 'document' | 'audio';
  tags: string[];
  cover?: string;
  domain?: string;
  created?: string;
  lastUpdate?: string;
  collection?: { $id: number };
  highlights?: Highlight[];
  important?: boolean;
  removed?: boolean;
  media?: Media[];
}

export interface Highlight {
  _id: string;
  text: string;
  note?: string;
  color?: string;
  created?: string;
}

export interface Media {
  link: string;
  type: string;
}

export interface Tag {
  _id: string;
  count?: number;
}

export interface UserStats {
  _id: number;
  count: number;
}

export interface CollectionCreate {
  title: string;
  parent?: { $id: number };
  public?: boolean;
  view?: 'list' | 'simple' | 'grid' | 'masonry';
  sort?: number;
  cover?: string[];
  color?: string;
}

export interface CollectionUpdate {
  title?: string;
  parent?: { $id: number };
  public?: boolean;
  view?: 'list' | 'simple' | 'grid' | 'masonry';
  sort?: number;
  cover?: string[];
  color?: string;
  expanded?: boolean;
}

export interface RaindropCreate {
  link: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  collection?: { $id: number };
  type?: string;
  important?: boolean;
  cover?: string;
  note?: string;
  highlights?: Highlight[];
}

export interface RaindropUpdate {
  title?: string;
  excerpt?: string;
  tags?: string[];
  collection?: { $id: number };
  cover?: string;
  important?: boolean;
  note?: string;
  link?: string;
  order?: number;
  pleaseParse?: boolean;
}

export interface ApiResponse<T> {
  result: boolean;
  item?: T;
  items?: T[];
  count?: number;
  user?: RaindropUser;
  errorMessage?: string;
}
