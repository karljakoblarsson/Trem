import { For } from "solid-js/web";
import { children, createSignal, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

type Status = "todo" | "doing" | "blocked" | "done";
interface Item {
  id: string;
  title: string;
  status: Status;
  description: string;
  children?: Item[];
}

type AppState = Item[];

const initialStore: Item[] = [
  {
    id: "1",
    title: "One",
    status: "todo",
    description: "One Description",
  },
  {
    id: "4",
    title: "Four",
    status: "todo",
    description: "Four Description",
  },
  {
    id: "2",
    title: "Two",
    status: "doing",
    description: "Two Description",
  },
  {
    id: "3",
    title: "Three",
    status: "done",
    description: "Three Description",
  },
];

type TremContext = [
  AppState,
  {
    setItemStatus: (id: string, newStatus: Status) => void
  },
]

const TremContext = createContext<TremContext>();
function TremProvider(props) {
  const [state, setState] = createStore<AppState>(props.state || initialStore);
  const trem: TremContext = [
    state,
    {
      setItemStatus(id: string, newStatus: Status) {
        console.log("setItemStatus", id, newStatus);
        setState(
          (card) => card.id === id,
          "status",
          (_) => newStatus
        );
      },
    },
  ];

  return (
    <TremContext.Provider value={trem}>{props.children}</TremContext.Provider>
  );
}

const useTremContext = () => {
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
          {(item, i) => <Section {...{ item, i }}></Section>}
        </For>
      </main>
    </TremProvider>
  );
};

const Section = (props) => {
  const [state, { setItemStatus }] = useTremContext();

  const dropHandler = (event) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    console.log("drop", props.item, data);
    setItemStatus(data, props.item);
  };
  const dragOverHandler = (event) => {
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
        {`${props.item}`}
        <Cards status={props.item} state={state} />
      </h2>
    </section>
  );
};

const Cards = (props) => {
  const children = (): Item[] =>
    props.state.filter((item: Item) => item.status === props.status);
  return (
    <>
      <For each={Array.from(children())}>
        {(card) => <Card title={card.title} id={card.id}></Card>}
      </For>
    </>
  );
};

const Card = (props) => {
  const [dragging, setDragging] = createSignal(false);
  const dragStartHandler = (event) => {
    console.log("dragStart", props.id);
    event.dataTransfer.setData("text/plain", props.id);
    setDragging(true);
  };

  const dragEndHandler = (event) => {
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
