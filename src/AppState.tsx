import {
  ParentComponent,
  createContext,
  createEffect,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { CardId } from './Comp';

type AppState = {
  open: CardId | undefined;
};

const initialStore: AppState = {
  open: undefined,
};

const makeTremAppStateContext = () => {
  const LS_KEY = "TREM_APP_STATE";
  const localStorageState = localStorage.getItem(LS_KEY);
  const startState = localStorageState
    ? JSON.parse(localStorageState)
    : initialStore;

  const [state, setState] = createStore<AppState>(startState);

  createEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(state)));

  return [
    state,
    {
      openCard(cardId: CardId) {
        setState("open", cardId);
      },
      closeCard() {
        setState("open", undefined);
      },
    },
  ] as const;
};


type TremAppStateContext = ReturnType<typeof makeTremAppStateContext>;
const TremAppStateContext = createContext<TremAppStateContext>();

export const TremAppStateProvider: ParentComponent = (props) => {
  const trem = makeTremAppStateContext();
  return (
    <TremAppStateContext.Provider value={trem}>{props.children}</TremAppStateContext.Provider>
  );
};

export const useTremAppStateContext = (): TremAppStateContext => {
  const context = useContext(TremAppStateContext);
  if (!context) {
    throw new Error("useTremContext: cannot find a TremContext");
  }
  return context;
};
