import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const typeDefs = `#graphql
  type Author {
    id: ID!
    name: String!
    books: [Book!]!
  }

  type Book {
    id: ID!
    title: String!
    author: Author!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    authors: [Author!]!
  }

  type Mutation {
    createAuthor(name: String!): Author!
    createBook(title: String!, authorId: ID!): Book!
  }
`;

const authors = [
  { id: "1", name: "George Orwell" },
  { id: "2", name: "Yevgeny Zamyatin" },
];

const books = [
  { id: "1", title: "1984", authorId: "1" },
  { id: "2", title: "My", authorId: "2" },
];

const resolvers = {
  Query: {
    books: () => books,
    book: (_, { id }) => books.find((book) => book.id == id),
    authors: () => authors,
  },
  Mutation: {
    createAuthor: (_, { name }) => {
      const newAuthor = { id: String(authors.length + 1), name };

      authors.push(newAuthor);

      return newAuthor;
    },
    createBook: (_, { title, authorId }) => {
      const newBook = { id: String(books.length + 1), title, authorId };

      books.push(newBook);

      return newBook;
    },
  },
  Author: {
    books: (author) => books.filter((book) => book.authorId == author.id),
  },
  Book: {
    author: (book) => authors.find((author) => author.id == book.authorId),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

startStandaloneServer(server, { listen: { port: 4000 } }).then(({ url }) => {
  console.log(`server ready at ${url}`);
});
