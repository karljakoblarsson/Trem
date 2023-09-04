import { For, Show } from "solid-js/web";
import {
  ParentComponent,
  Component,
  createSignal,
  createContext,
  createEffect,
  useContext,
  Accessor,
} from "solid-js";
import { createStore } from "solid-js/store";
import { TremAppStateProvider, useTremAppStateContext } from './AppState';

// type Status = "todo" | "doing" | "blocked" | "done";
export type CardId = string;

interface Item {
  id: CardId;
  title: string;
  columnId: string;
  description: string;
  children?: Item[];
}

type AppState = {
  cards: Item[];
};

const initialStore: AppState = {
  cards: [
  ],
};

const makeTremContext = () => {
  const LS_KEY = "TREM_STATE";
  const localStorageState = localStorage.getItem(LS_KEY);
  const startState = localStorageState
    ? JSON.parse(localStorageState)
    : initialStore;

  const [state, setState] = createStore<AppState>(startState);

  createEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(state)));

  return [
    state,
    {
      setItemColumn(id: string, newColumnId: string) {
        console.log("setItemColumn", id, newColumnId);
        setState(
          "cards",
          (card) => card?.id === id,
          "columnId",
          (_) => newColumnId
        );
      },
      addItem(title: string, columnId: string) {
        console.log("Adding item:", title);
        setState("cards", (cards) => [
          ...cards,
          { id: crypto.randomUUID(), title, columnId, description: "" },
        ]);
      },
      removeCard(cardId: CardId) {
        setState("cards", (card) => card?.id === cardId, undefined);
      },
      setDescription(cardId: CardId, description: string) {
        setState(
          "cards",
          (card) => card?.id === cardId,
          "description",
          description
        );
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
      <TremAppStateProvider>
        <main>
          <For each={statuses}>
            {(columnId, i) => <Section {...{ columnId, i }}></Section>}
          </For>
        </main>
      </TremAppStateProvider>
    </TremProvider>
  );
};

const Section: Component<{ columnId: string; i: Accessor<number> }> = (
  props
) => {
  const [state, { setItemColumn }] = useTremContext();
  const [appState, _] = useTremAppStateContext();

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
  const [_, { addItem }] = useTremContext();
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
  const [state, _] = useTremContext();
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
    useTremContext();
  const [appState, { openCard, closeCard }] = useTremAppStateContext();
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
