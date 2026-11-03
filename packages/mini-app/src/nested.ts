/** An element written in place: its children sit inside it instead of being listed by id. */
type NestedElement = {
  type: string;
  props?: unknown;
  children?: unknown[];
  on?: unknown;
  visible?: unknown;
  repeat?: unknown;
};

type FlatElement = Omit<NestedElement, "children"> & { children: string[] };

export type FlatSpec = {
  root: string;
  elements: Record<string, FlatElement>;
  state?: unknown;
};

const MAX_ELEMENTS = 2000;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * A spec can be flat (json-render's own form: a root id and an elements map) or nested: `root` is
 * the top element and each element lists its children as elements. Nested is the form a bot writes
 * because there are no ids to keep in step. Returns a flat spec, or why the file cannot be one.
 */
export function flattenSpec(value: unknown): FlatSpec | { problem: string } {
  if (!isObject(value)) return { problem: "spec must be an object" };
  if (typeof value.root === "string") {
    const { elements } = value;
    if (!isObject(elements)) return { problem: "spec.elements must be an object" };
    return {
      root: value.root,
      state: value.state,
      elements: Object.fromEntries(
        Object.entries(elements).map(([id, element]) => [
          id,
          isObject(element)
            ? ({
                ...element,
                props: element.props ?? {},
                children: element.children ?? [],
              } as FlatElement)
            : (element as FlatElement),
        ]),
      ),
    };
  }
  if (!isObject(value.root)) return { problem: "spec.root must be an element or an element id" };

  const elements: Record<string, FlatElement> = {};
  let next = 0;
  let problem: string | null = null;
  const add = (node: unknown, path: string): string | null => {
    if (problem) return null;
    if (!isObject(node) || typeof node.type !== "string") {
      problem = `${path} must be an element with a type`;
      return null;
    }
    if (next >= MAX_ELEMENTS) {
      problem = `too many elements (limit ${MAX_ELEMENTS})`;
      return null;
    }
    next += 1;
    const id = `e${next}`;
    const { children, ...rest } = node as NestedElement;
    if (children !== undefined && !Array.isArray(children)) {
      problem = `${path}.children must be a list of elements`;
      return null;
    }
    const ids: string[] = [];
    // Reserve the id before the children so ids follow reading order.
    elements[id] = { ...rest, props: rest.props ?? {}, children: ids };
    (children ?? []).forEach((child, index) => {
      const childId = add(child, `${path}.children[${index}]`);
      if (childId) ids.push(childId);
    });
    return id;
  };
  const root = add(value.root, "spec.root");
  if (problem || !root) return { problem: problem ?? "spec.root is empty" };
  return { root, elements, state: value.state };
}
