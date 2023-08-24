import { For } from "solid-js/web";
import { children } from "solid-js";
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
        {(item) => <Section setFn={setItemStatus} item={item} state={state}></Section>}
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
    props.setFn(data, props.item);
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
  const dragStartHandler = (event) => {
    console.log("dragStart", props.id);
    event.dataTransfer.dropEffect = "move";
    event.dataTransfer.setData("text/plain", props.id);
  };

  return (
    <div draggable={true} onDragStart={dragStartHandler} class="card">
      <h3>{props.title}</h3>
    </div>
  );
};

export default Comp;
