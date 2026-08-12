export type AppLocale = "zh-CN" | "en";

export type MessageKey =
  | "app.title"
  | "todos.loading"
  | "todos.count"
  | "theme.label"
  | "theme.system"
  | "theme.light"
  | "theme.dark"
  | "lang.label"
  | "lang.zh"
  | "lang.en"
  | "todos.add"
  | "todos.placeholder"
  | "todos.newLabel"
  | "todos.delete"
  | "todos.emptyTitle"
  | "todos.emptyDescription"
  | "todos.errorTitle"
  | "todos.seed"
  | "todos.seedItem";

export type MessageCatalog = Record<MessageKey, string>;

export type MessageValues = Record<string, string | number>;
