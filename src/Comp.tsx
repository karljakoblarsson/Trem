import { For } from "solid-js/web";
import {
  ParentComponent,
  Component,
  createSignal,
  createContext,
  useContext,
  Accessor,
} from "solid-js";
import { createStore } from "solid-js/store";

// type Status = "todo" | "doing" | "blocked" | "done";
interface Item {
  id: string;
  title: string;
  columnId: string;
  description: string;
  children?: Item[];
}

type AppState = Item[];

const initialStore: Item[] = [
  {
    id: "1",
    title: "One",
    columnId: "todo",
    description: "One Description",
  },
  {
    id: "4",
    title: "Four",
    columnId: "todo",
    description: "Four Description",
  },
  {
    id: "2",
    title: "Two",
    columnId: "doing",
    description: "Two Description",
  },
  {
    id: "3",
    title: "Three",
    columnId: "done",
    description: "Three Description",
  },
];

const makeTremContext = () => {
  const [state, setState] = createStore<AppState>(initialStore);
  return [
    state,
    {
      setItemColumn(id: string, newColumnId: string) {
        console.log("setItemColumn", id, newColumnId);
        setState(
          (card) => card.id === id,
          "columnId",
          (_) => newColumnId
        );
      },
      addItem(title: string, columnId: string) {
        console.log("Adding item:", title);
        setState([
          ...state,
          { id: crypto.randomUUID(), title, columnId, description: "" },
        ]);
      },
    },
  ] as const;
};

type TremContext = ReturnType<typeof makeTremContext>;
const TremContext = createContext<TremContext>();

const TremProvider: ParentComponent = (props) => {
  const trem = makeTremContext();
  return (
    <TremContext.Provider value={trem}>{props.children}</TremContext.Provider>
  );
};

const useTremContext = (): TremContext => {
  const context = useContext(TremContext);
  if (!context) {
    throw new Error("useTremContext: cannot find a TremContext");
  }
  return context;
};

const Comp = () => {
  const statuses = ["todo", "blocked", "doing", "done"];

  return (
    <TremProvider>
      <main>
        <For each={statuses}>
          {(columnId, i) => <Section {...{ columnId, i }}></Section>}
        </For>
      </main>
    </TremProvider>
  );
};

const Section: Component<{ columnId: string; i: Accessor<number> }> = (
  props
) => {
  const [_, { setItemColumn }] = useTremContext();

  const dropHandler = (event: DragEvent) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    console.log("drop", props.columnId, data);
    setItemColumn(data, props.columnId);
  };
  const dragOverHandler = (event: DragEvent) => {
    event.preventDefault();
    console.log("dragOver");
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <section
      onDrop={dropHandler}
      onDragOver={dragOverHandler}
      class="card-section"
      style={{
        "background-color": `hsla(${30 + props.i() * 35}, 70%,  90%, 1)`,
      }}
    >
      <h2>
        {`${props.columnId}`}
        <Cards columnId={props.columnId} />
        <AddCard columnId={props.columnId} />
      </h2>
    </section>
  );
};

const AddCard: Component<{ columnId: string }> = (props) => {
  const [_, { addItem }] = useTremContext();
  const [newTitle, setNewTitle] = createSignal<string | undefined>();
  const addHandler = (event: SubmitEvent) => {
    event.preventDefault();
    addItem(newTitle(), props.columnId);
    setNewTitle(undefined);
  };
  return (
    <div >
      <form class="addCard" onSubmit={addHandler}>
        <input type="text" onInput={(e) => setNewTitle(e.target.value)} />
        <button>+</button>
      </form>
    </div>
  );
};

const Cards: Component<{ columnId: string }> = (props) => {
  const [state, _] = useTremContext();
  const children = (): Item[] =>
    state.filter((item: Item) => item.columnId === props.columnId);
  return (
    <>
      <For each={Array.from(children())}>
        {(card) => <Card {...card}></Card>}
      </For>
    </>
  );
};

const Card: Component<Item> = (props) => {
  const [dragging, setDragging] = createSignal(false);
  const dragStartHandler = (event: DragEvent) => {
    console.log("dragStart", props.id);
    event.dataTransfer.setData("text/plain", props.id);
    setDragging(true);
  };

  const dragEndHandler = (_: DragEvent) => {
    setDragging(false);
  };

  return (
    <div
      draggable={true}
      onDragStart={dragStartHandler}
      onDragEnd={dragEndHandler}
      classList={{ card: true, dragging: dragging() }}
    >
      <h3>{props.title}</h3>
    </div>
  );
};

export default Comp;
