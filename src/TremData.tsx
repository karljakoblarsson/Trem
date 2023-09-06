import {
  ParentComponent,
  createContext,
  useContext,
  onCleanup,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import * as Y from "yjs";
import type { Map as YMap } from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";

export type CardId = string;
export type ColumnId = string;

export type Item = {
  id: CardId;
  title: string;
  columnId: string;
  description: string;
};

export type SyncItem = ExtendsYMap<Item>;

export type ColumnDef = {
  title: string;
  before: ColumnId | undefined;
  after: ColumnId | undefined;
  visibleOnBoard: boolean;
};

export type SyncColumnDef = ExtendsYMap<ColumnDef>;

export type BoardSettings = Partial<{
  title: string;
  background: string;
  columnDefs: ExtendsYMap<Record<ColumnId, ColumnDef>>;
}>;
export type SyncBoardSettings = ExtendsYMap<BoardSettings>;

export type Cards = Record<CardId, SyncItem>;
export type SyncCards = ExtendsYMap<Cards>;

export type SyncTremData = {
  cards?: SyncCards;
  boardSettings?: SyncBoardSettings;
};

export type TremDataStore = {
  cards?: Cards;
  boardSettings?: BoardSettings;
};

type FlattenYMap<T> = T extends object
  ? T extends ExtendsYMap<infer Data>
    ? Data
    : T
  : T;

type FlattenYSyncTypes<T> = {
  [Key in keyof T]: T[Key] extends object
    ? FlattenYSyncTypes<FlattenYMap<T[Key]>>
    : T[Key];
};

export interface ExtendsYMap<
  Data extends Record<string, unknown>,
  Keys extends keyof Data & string = keyof Data & string
> extends YMap<any> {
  // constructor<Key extends Keys>(entries?: Iterable<readonly [Key, Data[Key]]> | undefined);

  clone(): ExtendsYMap<Data, Keys>;

  delete(key: Keys & string): void;

  set<Key extends Keys>(key: Key, value: Data[Key]): Data[Key] & any;

  get<Key extends Keys>(key: Key): Data[Key];

  has<Key extends Keys>(key: Key): boolean;

  clear(): void;

  toJSON(): FlattenYSyncTypes<Data>;
}

const makeTremDataContext = () => {
  // ------------------------------------------------------------------------------
  // Yjs;

  const ydoc = new Y.Doc();
  // console.log("clientId", ydoc.clientID);
  // ydoc.on('update', console.log);

  const ycards: SyncCards = ydoc.getMap("cards");
  const yboardsettings: SyncBoardSettings = ydoc.getMap("boardSettings");

  // Solid
  const [state, setState] = createStore({
        cards: ycards.toJSON(),
        boardSettings: yboardsettings.toJSON(),
  });

  const observer = (k: string, val: SyncItem | SyncBoardSettings) => (_: any) => {
    console.log('observer', state, val.toJSON());
    const newState = { ...state };
    newState[k] = val.toJSON();
    setState(
      reconcile(newState)
    );
  };

  const cardsObs = observer('cards', ycards);
  const settingsObs = observer('boardSettings', yboardsettings)
  ycards.observeDeep(cardsObs);
  yboardsettings.observeDeep(settingsObs);

  onCleanup(() => {
    ycards.unobserveDeep(cardsObs);
    yboardsettings.unobserveDeep(settingsObs);
  });
  // END Solid

      yboardsettings.set(
        "background",
        `linear-gradient(
          90deg,
          rgba(251,231,198,1) 0%,
          rgba(180,248,200,1) 33%,
          rgba(160,231,229,1) 67%,
          rgba(255,174,188,1) 100%)`
      );
  ydoc.transact(() => {
    if (!yboardsettings.has("background")) {
      yboardsettings.set(
        "background",
        `linear-gradient(
          90deg,
          rgba(251,231,198,1) 0%,
          rgba(180,248,200,1) 33%,
          rgba(160,231,229,1) 67%,
          rgba(255,174,188,1) 100%)`
      );
    }
    if (!yboardsettings.has("title")) {
      yboardsettings.set("title", "New Board");
    }
  });

  const signalingServers = ["ws://localhost:4444"];
  const rtcOptions = {
    signaling: signalingServers,
    options: {
      password: "secret",
    },
  };

  const indexeddbProvider = new IndexeddbPersistence("trem-data", ydoc);
  indexeddbProvider.whenSynced.then(() => {
    console.log("loaded data from indexed db");
  });

  const webrtcProvider = new WebrtcProvider(
    "trem-data-demo-qwepriu",
    ydoc,
    rtcOptions
  );
  webrtcProvider.on("peers", console.log);

  const websocketProvider = new WebsocketProvider(
    "ws://localhost:1234",
    "trem-data-demo-qwepriu",
    ydoc
  );

  // ---------------------------------------------------------------------------

  return [
    state,
    {
      setItemColumn(id: string, newColumnId: string) {
        const card: SyncItem = ycards.get(id);
        card.set("columnId", newColumnId);
      },
      addItem(title: string, columnId: string) {
        const id: CardId = crypto.randomUUID();
        const card = new Y.Map() as SyncItem;

        card.set("id", id);
        card.set("title", title);
        card.set("columnId", columnId);
        card.set("description", "");

        ycards.set(id, card);
        console.log("Adding item:", title, card, card.toJSON());
      },
      removeCard(cardId: CardId) {
        ycards.delete(cardId);
      },
      setDescription(cardId: CardId, description: string) {
        const card: SyncItem = ycards.get(cardId);
        card.set("description", description);
      },
    },
  ] as const;
};

type TremDataContext = ReturnType<typeof makeTremDataContext>;
const TremDataContext = createContext<TremDataContext>();

export const TremDataProvider: ParentComponent = (props) => {
  const trem = makeTremDataContext();
  return (
    <TremDataContext.Provider value={trem}>
      {props.children}
    </TremDataContext.Provider>
  );
};

export const useTremDataContext = (): TremDataContext => {
  const context = useContext(TremDataContext);
  if (!context) {
    throw new Error("useTremDataContext: cannot find a TremDataContext");
  }
  return context;
};
