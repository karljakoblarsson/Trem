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
  // console.log("clientId", ydoc.clientID);

  // ydoc.on('update', console.log);

  const ystate: ExtendsYMap<SyncTremData> = ydoc.getMap("tremState");

  // Solid
  const [state, setState] = createStore(ystate.toJSON());
  // const [state, setState] = createStore<TremDataStore>(ystate.toJSON());

  const observer = (events, transaction) => {
    // console.log('observer', state, ystate.toJSON());
    setState(reconcile(ystate.toJSON()));
    // console.log('testsetsetestset');
  };

  ystate.observeDeep(observer);
  onCleanup(() => ystate.unobserveDeep(observer));
  // END Solid

  let ycards: SyncCards;
  ydoc.transact(() => {
    if (!ystate.has("cards")) {
      console.log('not has ycards');
      ycards = new Y.Map();
      ystate.set("cards", ycards);
    } else {
      console.log('has ycards');
      ycards = ystate.get("cards");
    }
  });
  console.log('ycards', ycards);

  let yboardsettings: SyncBoardSettings;
  ydoc.transact(() => {
    if (!ystate.has("boardSettings")) {
      console.log('not has yboard');
      yboardsettings = new Y.Map();
      ystate.set("boardSettings", yboardsettings);
      yboardsettings.set(
        "background",
        `linear-gradient(
          90deg,
          rgba(251,231,198,1) 0%,
          rgba(180,248,200,1) 33%,
          rgba(160,231,229,1) 67%,
          rgba(255,174,188,1) 100%)`
      );
      yboardsettings.set("title", "New Board");
    } else {
      console.log('has yboard');
      yboardsettings = ystate.get("boardSettings");
    }
  });

  console.log('yboardsettings', ycards);

  // setInterval(() => {
  //   console.log("webrtc", webrtcProvider);
  // }, 15000);
  // setInterval(() => { console.log('conns', webrtcProvider?.room.webrtcConns)
  // }, 3000);

  // const nested = new Y.Map();
  // nested.set('id', 'test');
  // const example = new Y.Map();
  // example.set( 'id', 'test-id');
  // example.set( 'title', 'Example');
  // example.set( 'columnId', 'todo');
  // example.set( 'description', 'test');
  // ycards.set('test-id', example as SyncItem);

  const signalingServers = ["ws://localhost:4444"];
  const rtcOptions = {
    signaling: signalingServers,
    options: {
      password: "secret",
    },
  };

  // const indexeddbProvider = new IndexeddbPersistence("trem-data", ydoc);
  // indexeddbProvider.whenSynced.then(() => {
  //   console.log("loaded data from indexed db");
  // });

  // const webrtcProvider = new WebrtcProvider(
  //   "trem-data-demo-qwepriu",
  //   ydoc,
  //   rtcOptions
  // );
  // webrtcProvider.on("peers", console.log);

  // const websocketProvider = new WebsocketProvider(
  //   "ws://localhost:1234",
  //   "trem-data-demo-qwepriu",
  //   ydoc
  // );

  // ------------------------------------------------------------------------------

  return [
    state,
    {
      setItemColumn(id: string, newColumnId: string) {
        // console.log("setItemColumn", id, newColumnId);
        const card: SyncItem = ycards.get(id);
        card.set("columnId", newColumnId);
      },
      addItem(title: string, columnId: string) {
        const id: CardId = crypto.randomUUID();
        const card = new Y.Map<string>();

        const arr = new Y.Array<string>();
        arr.push(['test']);
        console.log(arr);

        card.set("id", id);
        card.set("title", title);
        card.set("columnId", columnId);
        card.set("description", "");

        ycards.set(id, card as SyncItem);
        // console.log(ycards);
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
