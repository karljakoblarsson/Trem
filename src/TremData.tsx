import {
  ParentComponent,
  createContext,
  createEffect,
  useContext,
  onCleanup,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";

import * as Y from 'yjs';
import type { Map as YMap } from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// type Status = "todo" | "doing" | "blocked" | "done";
export type CardId = string;

export type Item = {
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

export interface ExtendsYMap<Data extends Record<string, unknown>, Keys extends keyof Data & string = keyof Data & string> extends YMap<any> {
    clone (): ExtendsYMap<Data, Keys>

    delete (key: Keys & string): void

    set<Key extends Keys> (key: Key, value: Data[Key]): Data[Key] & any

    get<Key extends Keys> (key: Key): Data[Key]

    has<Key extends Keys> (key: Key): boolean

    clear (): void
}

const makeTremDataContext = () => {
  // ------------------------------------------------------------------------------
  // Yjs;

  const ydoc = new Y.Doc();
  console.log('clientId', ydoc.clientID);

  ydoc.on('update', update => {
    console.log('update', update);
  });

  ydoc.on('beforeTransaction', console.log)
  ydoc.on('beforeObserverCalls', console.log)
  ydoc.on('afterTransaction', console.log)
  ydoc.on('update', console.log)

  const indexeddbProvider = new IndexeddbPersistence('trem-data', ydoc);
  indexeddbProvider.whenSynced.then(() => {
    console.log('loaded data from indexed db');
  });

  const signalingServers = ['ws://localhost:4444'];
  const rtcOptions = {
    signaling: signalingServers,
    options: {
      password: 'secret',
    }
  };
  const webrtcProvider = new WebrtcProvider('trem-data-demo-opiurjg', ydoc, rtcOptions);

  const websocketProvider = new WebsocketProvider(
      'ws://localhost:1234', 'trem-data-demo-opiurjg', ydoc
  );

  const ycards: YMap<ExtendsYMap<Item>> = ydoc.getMap<ExtendsYMap<Item>>('cards');
  ycards.observeDeep(event => {
    console.log('ycards was modified', event);
    console.log(ycards.toJSON());
  });

  setInterval(() => { console.log('webrtc', webrtcProvider)
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

  const [state, setState] = createStore<Record<CardId, Item>>(ycards.toJSON());

  const observer = (events, transaction) => {
    console.log(ycards.toJSON());
    setState(reconcile(ycards.toJSON()));
  };

  ycards.observeDeep(observer);
  onCleanup(() => ycards.unobserveDeep(observer));

  return [
    state,
    {
      setItemColumn(id: string, newColumnId: string) {
        console.log("setItemColumn", id, newColumnId);
        const card: ExtendsYMap<Item> = ycards.get(id);
        card.set('columnId', newColumnId);
      },
      addItem(title: string, columnId: string) {
        console.log("Adding item:", title);
        const id: CardId = crypto.randomUUID();
        const card: ExtendsYMap<Item> = new Y.Map();
        card.set('id', id);
        card.set('title', title);
        card.set('columnId', columnId);
        card.set('description', '');

        ycards.set(id,
          card
        );
      },
      removeCard(cardId: CardId) {
        ycards.delete(cardId);
      },
      setDescription(cardId: CardId, description: string) {
        const card: ExtendsYMap<Item> = ycards.get(cardId);
        card.set('description', description);
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
