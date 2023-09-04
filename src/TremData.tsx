import {
  ParentComponent,
  createContext,
  createEffect,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";

// type Status = "todo" | "doing" | "blocked" | "done";
export type CardId = string;

export interface Item {
  id: CardId;
  title: string;
  columnId: string;
  description: string;
  children?: Item[];
}

export type TremData = {
  cards: Item[];
};

const initialStore: TremData = {
  cards: [
  ],
};

const makeTremDataContext = () => {
  const LS_KEY = "TREM_STATE";
  const localStorageState = localStorage.getItem(LS_KEY);
  const startState = localStorageState
    ? JSON.parse(localStorageState)
    : initialStore;

  const [state, setState] = createStore<TremData>(startState);

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

type TremDataContext = ReturnType<typeof makeTremDataContext>;
const TremDataContext = createContext<TremDataContext>();

export const TremDataProvider: ParentComponent = (props) => {
  const trem = makeTremDataContext();
  return (
    <TremDataContext.Provider value={trem}>{props.children}</TremDataContext.Provider>
  );
};

export const useTremDataContext = (): TremDataContext => {
  const context = useContext(TremDataContext);
  if (!context) {
    throw new Error("useTremDataContext: cannot find a TremDataContext");
  }
  return context;
};
