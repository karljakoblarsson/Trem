import {
  ParentComponent,
  createContext,
  createEffect,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { CardId } from './TremData';

type ClientState = {
  open: CardId | undefined;
};

const initialStore: ClientState = {
  open: undefined,
};

const makeTremClientStateContext = () => {
  const LS_KEY = "TREM_APP_STATE";
  const localStorageState = localStorage.getItem(LS_KEY);
  const startState = localStorageState
    ? JSON.parse(localStorageState)
    : initialStore;

  const [state, setState] = createStore<ClientState>(startState);

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


type TremClientStateContext = ReturnType<typeof makeTremClientStateContext>;
const TremClientStateContext = createContext<TremClientStateContext>();

export const TremClientStateProvider: ParentComponent = (props) => {
  const trem = makeTremClientStateContext();
  return (
    <TremClientStateContext.Provider value={trem}>{props.children}</TremClientStateContext.Provider>
  );
};

export const useTremClientStateContext = (): TremClientStateContext => {
  const context = useContext(TremClientStateContext);
  if (!context) {
    throw new Error("useTremClientStateContext: cannot find a TremContext");
  }
  return context;
};
