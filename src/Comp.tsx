import { For, Show } from "solid-js/web";
import { Component, ParentComponent, createSignal, Accessor } from "solid-js";
import {
  TremClientStateProvider,
  useTremClientStateContext,
} from "./ClientState";
import { CardId,  TremDataProvider, useTremDataContext } from "./TremData";

const Comp = () => {

  return (
    <TremDataProvider>
      <TremClientStateProvider>
        <BackgroundContainer>
          <>
            <Header />
            <Board />
          </>
        </BackgroundContainer>
      </TremClientStateProvider>
    </TremDataProvider>
  );
};

const BackgroundContainer: ParentComponent<{}> = (props) => {
  const [state, _] = useTremDataContext();

  const defaultBackground = 'yellow';
  return (
  <div
    class="background-container"
    style={{
      background:
        state.boardSettings?.background || defaultBackground,
    }}
  >
    {props.children}
  </div>
)}

const Header: Component = () => {
  const [state, _] = useTremDataContext();

  return (
  <header>
    <h1>{ state.boardSettings?.title }</h1>
  </header>
)}

const Board: Component = () => {
  const statuses = ["todo", "blocked", "doing", "done"];
  return (
    <main>
      <For each={statuses}>
        {(columnId, i) => <Section {...{ columnId, i }}></Section>}
      </For>
    </main>
)}


const Section: Component<{ columnId: string; i: Accessor<number> }> = (
  props
) => {
  const [state, { setItemColumn }] = useTremDataContext();
  const [appState, _] = useTremClientStateContext();

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

  const isOpen = () =>
    Object.entries(state.cards).find(
      ([id, item]) =>
        item?.columnId === props.columnId && item?.id === appState.open
    ) !== undefined;

  return (
    <section
      onDrop={dropHandler}
      onDragOver={dragOverHandler}
      classList={{
        "card-section": true,
        open: isOpen(),
      }}
      style={
        {
          // "background-color": `hsla(${30 + props.i() * 35}, 70%,  90%, 1)`,
        }
      }
    >
      <h2 class="column-title">
        <input type="text" value={props.columnId} />
        <button>+</button>
      </h2>
      <div class="card-container">
        <Cards columnId={props.columnId} />
        <AddCard columnId={props.columnId} />
      </div>
    </section>
  );
};

const AddCard: Component<{ columnId: string }> = (props) => {
  const [_, { addItem }] = useTremDataContext();
  const [newTitle, setNewTitle] = createSignal<string | undefined>();
  let titleInput: HTMLInputElement;

  const submitHandler = (event: SubmitEvent) => {
    event.preventDefault();
    addItem(newTitle(), props.columnId);
    setNewTitle(undefined);
    if (titleInput) {
      titleInput.value = "";
    }
  };

  return (
    <div>
      <form class="addCard" onSubmit={submitHandler}>
        <input
          ref={titleInput}
          type="text"
          onInput={(e) => setNewTitle(e.target.value)}
          placeholder="+ Add new card"
        />
        <button>+</button>
      </form>
    </div>
  );
};

const Cards: Component<{ columnId: string }> = (props) => {
  const [state, _] = useTremDataContext();
  const children = () =>
    Object.entries(state.cards)
      .filter(([id, val]) => val?.columnId === props.columnId);
  console.log(children);
  return (
    <>
      <For each={Array.from(children())}>
        {([id, card]) => <Card id={id} {...card}></Card>}
      </For>
    </>
  );
};

interface CardProps {
  id: CardId;
  title: string;
  columnId: string;
  description: string;
}

const Card: Component<CardProps> = (props) => {
  const [_, { removeCard, setDescription }] = useTremDataContext();
  const [appState, { openCard, closeCard }] = useTremClientStateContext();
  const isOpen = () => appState.open === props.id;

  const [editDescription, setEditDescription] = createSignal(false);
  const [dragging, setDragging] = createSignal(false);
  const dragStartHandler = (event: DragEvent) => {
    console.log("dragStart", props.id);
    event.dataTransfer.setData("text/plain", props.id);
    setDragging(true);
  };

  const dragEndHandler = (_: DragEvent) => {
    setDragging(false);
  };

  const clickHandler = (_: MouseEvent) => {
    openCard(props.id);
  };
  const closeHandler = (_: MouseEvent) => {
    closeCard();
  };
  const deleteHandler = (_: MouseEvent) => {
    removeCard(props.id);
  };

  let textArea: HTMLTextAreaElement;

  return (
    <div
      draggable={true}
      onDragStart={dragStartHandler}
      onDragEnd={dragEndHandler}
      classList={{ card: true, dragging: dragging() }}
      onClick={clickHandler}
    >
      <h3>{props.title}</h3>
      <Show when={isOpen()}>
        <div class="description">
          <Show
            when={editDescription()}
            fallback={
              <p
                class="descriptionText"
                onClick={(_) => {
                  setEditDescription(true);
                  textArea?.focus();
                  textArea?.setSelectionRange(-1, -1);
                }}
              >
                {props.description}
              </p>
            }
          >
            <textarea
              ref={textArea}
              onBlur={(e) => {
                setDescription(props.id, e.target.value);
                setEditDescription(false);
              }}
            >
              {props.description}
            </textarea>
          </Show>
        </div>
        <div class="action-bar">
          <button onClick={deleteHandler}>Delete</button>
          <button onClick={closeHandler}>Close</button>
        </div>
      </Show>
    </div>
  );
};

export default Comp;
