export interface Post {
  slug: string;
  title: string;
  author: {
    name: string;
    picture: string;
  };
  coverImage: {
    url: string;
  };
  date: string;
  excerpt: string;
  content: string;
}
