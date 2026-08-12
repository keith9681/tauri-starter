import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Item } from "@astryxdesign/core/Item";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  HStack,
  VStack,
} from "@astryxdesign/core/Layout";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  createTodo,
  deleteTodo,
  listTodos,
  type Todo,
  updateTodo,
} from "./api/client";
import type { AppLocale } from "./i18n";
import { useColorMode, useLocale, type ColorMode } from "./providers";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animate list reorder/removal via the View Transitions API (WebView2 / Chromium). */
function withListTransition(update: () => void) {
  if (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !prefersReducedMotion()
  ) {
    document.startViewTransition(() => {
      flushSync(update);
    });
    return;
  }
  update();
}

function TodoRow({
  todo,
  busy,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  busy: boolean;
  onToggle: (todo: Todo) => void;
  onRemove: (id: number) => void;
}) {
  const { t } = useLocale();
  const checkboxRef = useRef<HTMLInputElement>(null);

  return (
    <Item
      density="compact"
      interactiveRef={checkboxRef}
      isDisabled={busy}
      style={{
        viewTransitionName: `todo-${todo.id}`,
        userSelect: "none",
      }}
      startContent={
        <CheckboxInput
          ref={checkboxRef}
          label={todo.title}
          isLabelHidden
          value={todo.done}
          isDisabled={busy}
          isLoading={busy}
          onChange={() => onToggle(todo)}
        />
      }
      label={
        <Text
          display="block"
          hasStrikethrough={todo.done}
          color={todo.done ? "secondary" : "primary"}
          maxLines={1}
        >
          {todo.title}
        </Text>
      }
      endContent={
        <IconButton
          label={t("todos.delete")}
          tooltip={t("todos.delete")}
          icon={<Icon icon="close" />}
          variant="ghost"
          size="sm"
          isDisabled={busy}
          onClick={() => onRemove(todo.id)}
        />
      }
    />
  );
}

function TodoApp() {
  const { mode, setMode } = useColorMode();
  const { locale, setLocale, t } = useLocale();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
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
      withListTransition(() => {
        setTodos((prev) => [...prev, todo]);
        setTitle("");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onSeedTestTodos() {
    setSeeding(true);
    setError(null);
    try {
      const stamp = Date.now().toString(36).slice(-4);
      const created: Todo[] = [];
      for (let i = 1; i <= 10; i++) {
        created.push(
          await createTodo(
            t("todos.seedItem", { n: i, stamp }),
          ),
        );
      }
      withListTransition(() => {
        setTodos((prev) => [...prev, ...created]);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  }

  async function onToggle(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    try {
      const updated = await updateTodo(todo.id, { done: !todo.done });
      withListTransition(() => {
        setTodos((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
      });
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
      withListTransition(() => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  const remaining = todos.filter((t) => !t.done).length;
  const ordered = [...todos].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <Layout
      height="fill"
      contentWidth={560}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={2} vAlign="center" hAlign="between">
            <HStack gap={2} vAlign="center">
              <Heading level={3}>{t("app.title")}</Heading>
              <Text type="supporting" color="secondary">
                {loading
                  ? t("todos.loading")
                  : t("todos.count", {
                      remaining,
                      total: todos.length,
                    })}
              </Text>
            </HStack>
            <HStack gap={2} vAlign="center">
              <SegmentedControl
                label={t("lang.label")}
                size="sm"
                value={locale}
                onChange={(next) => setLocale(next as AppLocale)}
              >
                <SegmentedControlItem value="zh-CN" label={t("lang.zh")} />
                <SegmentedControlItem value="en" label={t("lang.en")} />
              </SegmentedControl>
              <SegmentedControl
                label={t("theme.label")}
                size="sm"
                value={mode}
                onChange={(next) => setMode(next as ColorMode)}
              >
                <SegmentedControlItem
                  value="system"
                  label={t("theme.system")}
                />
                <SegmentedControlItem value="light" label={t("theme.light")} />
                <SegmentedControlItem value="dark" label={t("theme.dark")} />
              </SegmentedControl>
              <Button
                label={t("todos.seed")}
                variant="secondary"
                size="sm"
                isLoading={seeding}
                isDisabled={loading || seeding}
                onClick={() => void onSeedTestTodos()}
              />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
    >
      <LayoutContent padding={4}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="end">
            <TextInput
              label={t("todos.newLabel")}
              isLabelHidden
              value={title}
              onChange={setTitle}
              placeholder={t("todos.placeholder")}
              hasAutoFocus
              width="100%"
              onEnter={() => void onAdd()}
            />
            <Button
              label={t("todos.add")}
              variant="primary"
              isDisabled={!title.trim()}
              onClick={() => void onAdd()}
            />
          </HStack>

          {error ? (
            <Banner
              status="error"
              title={t("todos.errorTitle")}
              description={error}
            />
          ) : null}

          {!loading && todos.length === 0 ? (
            <EmptyState
              title={t("todos.emptyTitle")}
              description={t("todos.emptyDescription")}
              isCompact
            />
          ) : null}

          {ordered.length > 0 ? (
            <VStack gap={0}>
              {ordered.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  busy={busyId === todo.id}
                  onToggle={(item) => void onToggle(item)}
                  onRemove={(id) => void onRemove(id)}
                />
              ))}
            </VStack>
          ) : null}
        </VStack>
      </LayoutContent>
    </Layout>
  );
}

function App() {
  return <TodoApp />;
}

export default App;
