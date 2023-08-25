import { For } from "solid-js/web";
import { children, createSignal } from "solid-js";
import { createStore } from "solid-js/store";

type Status = "todo" | "doing" | "blocked" | "done";
interface Item {
  id: string;
  title: string;
  status: Status;
  description: string;
  children?: Item[];
}

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

type AppState = Item[];

const Comp = () => {
  const [state, setState] = createStore<AppState>(initialStore);
  const statuses = () =>
    state.reduce((acc, item) => acc.add(item.status), new Set());

  const setItemStatus = (id: string, newStatus: Status) => {
    console.log("setItemStatus", id, newStatus);
    setState(
      (card) => card.id === id,
      "status",
      (_) => newStatus
    );
  };

  return (
    <main>
      <For each={Array.from(statuses().values())}>
        {(item, i) => (
          <Section {...{ item, state, setItemStatus, i }}></Section>
        )}
      </For>
    </main>
  );
};

const Section = (props) => {
  const cards = children(() => props.children);

  const dropHandler = (event) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    console.log("drop", props.item, data);
    props.setItemStatus(data, props.item);
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
        <Cards status={props.item} state={props.state} />
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
