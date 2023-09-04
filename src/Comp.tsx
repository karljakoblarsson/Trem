import { For, Show } from "solid-js/web";
import {
  Component,
  createSignal,
  Accessor,
} from "solid-js";
import { TremClientStateProvider, useTremClientStateContext } from './ClientState';
import { Item, TremDataProvider, useTremDataContext } from './TremData';


const Comp = () => {
  const statuses = ["todo", "blocked", "doing", "done"];

  return (
    <TremDataProvider>
      <TremClientStateProvider>
        <main>
          <For each={statuses}>
            {(columnId, i) => <Section {...{ columnId, i }}></Section>}
          </For>
        </main>
      </TremClientStateProvider>
    </TremDataProvider>
  );
};

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
    state.cards.find(
      (card) => card?.columnId === props.columnId && card?.id === appState.open
    ) !== undefined;

  return (
    <section
      onDrop={dropHandler}
      onDragOver={dragOverHandler}
      classList={{
        "card-section": true,
        open: isOpen(),
      }}
      style={{
        "background-color": `hsla(${30 + props.i() * 35}, 70%,  90%, 1)`,
      }}
    >
      <h2 class="column-title">{`${props.columnId}`}</h2>
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
        />
        <button>+</button>
      </form>
    </div>
  );
};

const Cards: Component<{ columnId: string }> = (props) => {
  const [state, _] = useTremDataContext();
  const children = (): Item[] =>
    state.cards.filter((item: Item) => item?.columnId === props.columnId);
  return (
    <>
      <For each={Array.from(children())}>
        {(card) => <Card {...card}></Card>}
      </For>
    </>
  );
};

const Card: Component<Item> = (props) => {
  const [_, { removeCard, setDescription }] =
    useTremDataContext();
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
