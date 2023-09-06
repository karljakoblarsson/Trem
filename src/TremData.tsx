import {
  ParentComponent,
  createContext,
  createEffect,
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

// type FlattenYSyncTypes<
//   Data extends Record<string, unknown>,
//   Keys extends keyof Data & string = keyof Data & string
// > = {
//   [Key in Keys]: Data[Key] extends object ? FlattenYSyncTypes<FlattenYMap<Data[Key]>> : Data[Key];
// };

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
  console.log("clientId", ydoc.clientID);

  // ydoc.on('update', update => {
  //   console.log('update', update);
  // });

  // ydoc.on('beforeTransaction', console.log)
  // ydoc.on('beforeObserverCalls', console.log)
  // ydoc.on('afterTransaction', console.log)
  // ydoc.on('update', console.log)

  const indexeddbProvider = new IndexeddbPersistence("trem-data", ydoc);
  indexeddbProvider.whenSynced.then(() => {
    console.log("loaded data from indexed db");
  });

  const signalingServers = ["ws://localhost:4444"];
  const rtcOptions = {
    signaling: signalingServers,
    options: {
      password: "secret",
    },
  };
  const webrtcProvider = new WebrtcProvider(
    "trem-data-demo-opiurjg",
    ydoc,
    rtcOptions
  );
  webrtcProvider.on("peers", console.log);

  const websocketProvider = new WebsocketProvider(
    "ws://localhost:1234",
    "trem-data-demo-opiurjg",
    ydoc
  );

  const ystate: ExtendsYMap<SyncTremData> = ydoc.getMap("tremState");

  const ycards: SyncCards = new Y.Map();
  ystate.set("cards", ycards);
  ycards.observeDeep((event) => {
    console.log("ycards was modified", event);
    console.log(ycards.toJSON());
  });

  const yboardsettings: SyncBoardSettings = new Y.Map();
  yboardsettings.set(
    "title",
    `linear-gradient(
      90deg,
      rgba(251,231,198,1) 0%,
      rgba(180,248,200,1) 33%,
      rgba(160,231,229,1) 67%,
      rgba(255,174,188,1) 100%)`
  );
  yboardsettings.set("background", "New Board");
  ystate.set("boardSettings", yboardsettings);

  setInterval(() => {
    console.log("webrtc", webrtcProvider);
  }, 15000);
  // setInterval(() => { console.log('conns', webrtcProvider?.room.webrtcConns)
  // }, 3000);

  // const nested = new Y.Map();
  // nested.set('id', 'test');
  // const example: ExtendsYMap<Item> = new Y.Map();
  // example.set( 'id', 'test-id');
  // example.set( 'title', 'Example');
  // example.set( 'columnId', 'todo');
  // example.set( 'description', 'test');
  // ycards.set('test-id', example);

  // ------------------------------------------------------------------------------

  const [state, setState] = createStore(ystate.toJSON());
  // const [state, setState] = createStore<TremDataStore>(ystate.toJSON());

  const observer = (events, transaction) => {
    console.log(ystate.toJSON());
    setState(reconcile(ystate.toJSON()));
  };

  ycards.observeDeep(observer);
  onCleanup(() => ycards.unobserveDeep(observer));

  return [
    state,
    {
      setItemColumn(id: string, newColumnId: string) {
        console.log("setItemColumn", id, newColumnId);
        const card: SyncItem = ycards.get(id);
        card.set("columnId", newColumnId);
      },
      addItem(title: string, columnId: string) {
        console.log("Adding item:", title);
        const id: CardId = crypto.randomUUID();
        const card = new Y.Map(
          Object.entries({
            id: id,
            title: title,
            columnId: columnId,
            description: "",
          })
        ) as SyncItem;

        ycards.set(id, card);
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
