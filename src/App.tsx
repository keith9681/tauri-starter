import { useCallback, useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  createTodo,
  deleteTodo,
  listTodos,
  type Todo,
  updateTodo,
} from "./api/client";

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setTodos(await listTodos());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAdd() {
    const next = title.trim();
    if (!next) return;

    setError(null);
    try {
      const todo = await createTodo(next);
      setTodos((prev) => [...prev, todo]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onToggle(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    try {
      const updated = await updateTodo(todo.id, { done: !todo.done });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <Layout
      height="auto"
      contentWidth={560}
      padding={4}
      header={
        <VStack gap={1}>
          <Heading level={1}>待办事项</Heading>
          <Text type="supporting" color="secondary">
            {loading ? "加载中…" : `未完成 ${remaining} / 共 ${todos.length}`}
          </Text>
        </VStack>
      }
    >
      <VStack gap={3}>
        <HStack gap={2} vAlign="end">
          <TextInput
            label="新待办"
            isLabelHidden
            value={title}
            onChange={setTitle}
            placeholder="添加一件事…"
            hasAutoFocus
            width="100%"
            onEnter={() => void onAdd()}
          />
          <Button
            label="添加"
            variant="primary"
            isDisabled={!title.trim()}
            onClick={() => void onAdd()}
          />
        </HStack>

        {error ? (
          <Banner status="error" title="请求失败" description={error} />
        ) : null}

        {!loading && todos.length === 0 ? (
          <EmptyState
            title="还没有待办"
            description="先添加一条吧。"
            isCompact
          />
        ) : null}

        <VStack gap={1}>
          {todos.map((todo) => (
            <HStack key={todo.id} gap={2} vAlign="center" justify="between">
              <CheckboxInput
                label={todo.title}
                value={todo.done}
                isDisabled={busyId === todo.id}
                isLoading={busyId === todo.id}
                onChange={() => void onToggle(todo)}
                width="100%"
              />
              <Button
                label="删除"
                variant="ghost"
                isDisabled={busyId === todo.id}
                onClick={() => void onRemove(todo.id)}
              />
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Layout>
  );
}

function App() {
  return <TodoApp />;
}

export default App;
