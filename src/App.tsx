import { FormEvent, useEffect, useRef, useState } from "react";
import { initScene } from "@webspatial/react-sdk";
import { GAME_STATES, GameEngine } from "./game/game-engine.js";
import { editImage, eventImageUrl, loadEvents, validateAnswer, type StoryEvent } from "./game/api";
import { IMAGE_CHANNEL_NAME, IMAGE_SCENE_NAME, type ImageChannelMessage, type ImagePayload } from "./game/image-channel";
import "./app.css";

const KEYWORD_TOKEN = "[PlayerKeyword]";
const INTRO_TEXT = "Welcome to your internship at Synergy Corp! We are so excited to have you with us. Here at Synergy, we're not just a company — we're a family. We are thrilled to have you spend your best years with us!";

interface EngineResult {
  positive: boolean;
  outcomeText: string;
  answer?: string;
}

interface Engine {
  state: string;
  attempt: number;
  eventIndex: number;
  currentEvent: StoryEvent;
  lastResult: EngineResult | null;
  start(): void;
  answer(word: string, result: EngineResult): EngineResult | null;
  showOutcome(): void;
  advance(): void;
  restart(): void;
}

function App() {
  const [game, setGame] = useState<Engine | null>(null);
  const [revision, setRevision] = useState(0);
  const [word, setWord] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<Blob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageWindowRef = useRef<Window | null>(null);
  const imageChannelRef = useRef<BroadcastChannel | null>(null);
  const currentImageRef = useRef<ImagePayload>({ kind: "empty", alt: "Waiting for the game" });

  useEffect(() => {
    loadEvents()
      .then((events) => setGame(new GameEngine(events) as Engine))
      .catch((error) => setStatus(`FAILED TO LOAD STORY: ${error.message}`));
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel(IMAGE_CHANNEL_NAME);
    imageChannelRef.current = channel;
    channel.onmessage = (event: MessageEvent<ImageChannelMessage>) => {
      if (event.data.kind === "ready") channel.postMessage(currentImageRef.current);
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (game?.state === GAME_STATES.UNANSWERED) inputRef.current?.focus();
  }, [game?.state, revision]);

  function mutate(action: (engine: Engine) => void) {
    if (!game) return;
    action(game);
    setRevision((value) => value + 1);
  }

  function publishImage(payload: ImagePayload) {
    currentImageRef.current = payload;
    imageChannelRef.current?.postMessage(payload);
  }

  function openImageWindow() {
    initScene(IMAGE_SCENE_NAME, (previous) => ({
      ...previous,
      defaultSize: { width: 960, height: 540 }
    }));
    imageWindowRef.current = window.open("/image-view", IMAGE_SCENE_NAME, "popup,width=960,height=540");
    if (!imageWindowRef.current) setStatus("ALLOW POPUPS TO OPEN THE IMAGE VIEW.");
  }

  function clearGeneratedImage() {
    setGeneratedImage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!game || game.state !== GAME_STATES.UNANSWERED || busy) return;
    const answer = word.trim();
    if (!answer) return;

    const answeredEvent = game.currentEvent;
    setBusy(true);
    setStatus("LOADING… GEMINI AND FLUX ARE WORKING IN PARALLEL");

    const [validation, image] = await Promise.allSettled([
      validateAnswer(answeredEvent.eventName, answer),
      editImage(answeredEvent.eventName, answer)
    ]);

    let outcome: EngineResult;
    const messages: string[] = [];
    if (validation.status === "fulfilled") {
      outcome = validation.value;
    } else {
      messages.push(`${validation.reason.message} Defaulting to false.`);
      outcome = {
        positive: false,
        outcomeText: "The validation system could not be reached. The attempt is recorded as a failure."
      };
    }

    if (image.status === "fulfilled") {
      clearGeneratedImage();
      setGeneratedImage(image.value);
    } else {
      messages.push(`Image edit failed: ${image.reason.message}`);
      clearGeneratedImage();
    }

    game.answer(answer, outcome);
    setStatus(messages.join(" "));
    setBusy(false);
    setRevision((value) => value + 1);
  }

  function action() {
    if (!game) return;
    setStatus("");
    if (game.state === GAME_STATES.INTRO) {
      // A direct user gesture avoids popup blocking in ordinary browsers and
      // creates a second OS-managed scene in WebSpatial.
      openImageWindow();
      mutate((engine) => engine.start());
    }
    else if (game.state === GAME_STATES.ACTION) mutate((engine) => engine.showOutcome());
    else if (game.state === GAME_STATES.POSITIVE || game.state === GAME_STATES.NEGATIVE) {
      clearGeneratedImage();
      setWord("");
      mutate((engine) => engine.advance());
    } else if (game.state === GAME_STATES.WON) {
      clearGeneratedImage();
      setWord("");
      mutate((engine) => engine.restart());
    }
  }

  useEffect(() => {
    if (!game) return;
    const current = game.currentEvent;
    let payload: ImagePayload;
    if (game.state === GAME_STATES.INTRO) {
      payload = { kind: "image", src: "/api/intro-image", alt: "Synergy Corp orientation" };
    } else if (game.state === GAME_STATES.UNANSWERED) {
      payload = { kind: "image", src: eventImageUrl(current.eventName, "context"), alt: current.eventName };
    } else if (game.state === GAME_STATES.ACTION) {
      payload = generatedImage
        ? { kind: "image", blob: generatedImage, alt: `Edited ${current.eventName} scene` }
        : { kind: "image", src: eventImageUrl(current.eventName, "action"), alt: current.eventName };
    } else if (game.state === GAME_STATES.POSITIVE || game.state === GAME_STATES.NEGATIVE) {
      payload = {
        kind: "image",
        src: eventImageUrl(current.eventName, game.state === GAME_STATES.POSITIVE ? "positiveOutcome" : "negativeOutcome"),
        alt: current.eventName
      };
    } else {
      payload = { kind: "empty", alt: "Game complete" };
    }
    publishImage(payload);
  }, [game, revision, generatedImage]);

  if (!game) {
    return <main className="loading-shell"><p>{status || "LOADING STORY…"}</p></main>;
  }

  const current = game.currentEvent;
  const state = game.state;
  const positive = state === GAME_STATES.POSITIVE;
  const isOutcome = positive || state === GAME_STATES.NEGATIVE;
  const showInput = state === GAME_STATES.UNANSWERED;

  let sceneText = "";
  if (state === GAME_STATES.INTRO) {
    sceneText = INTRO_TEXT;
  } else if (state === GAME_STATES.UNANSWERED) {
    sceneText = current.narrative.replaceAll(KEYWORD_TOKEN, "___");
  } else if (state === GAME_STATES.ACTION) {
    sceneText = "IMAGE GENERATED. REVIEW THE ACTION IN THE IMAGE WINDOW.";
  } else if (isOutcome) {
    sceneText = game.lastResult?.outcomeText || "";
  } else {
    sceneText = "CONGRATULATIONS, YOU'VE PASSED YOUR INTERNSHIP AND HAVE RECEIVED A FULL TIME OFFER!";
  }

  const buttonLabel = state === GAME_STATES.INTRO ? "START GAME"
    : state === GAME_STATES.ACTION ? "CONTINUE"
    : positive ? "NEXT"
    : state === GAME_STATES.NEGATIVE ? "TRY AGAIN"
    : "PLAY AGAIN";

  return (
    <main className="stage" data-state={state}>
      <header className="hud spatial-panel" enable-xr>
        <span>996.exe</span>
        <span>ATTEMPT {String(game.attempt).padStart(2, "0")}</span>
      </header>

      {(sceneText || status) && (
        <section className="narrative-panel spatial-panel" aria-live="polite" enable-xr>
          {sceneText && <p>{sceneText}</p>}
          {status && <p className="status-line">{status}</p>}
        </section>
      )}

      <section className="controls spatial-panel" enable-xr>
        {showInput ? (
          <form onSubmit={submit} autoComplete="off">
            <label className="command-line" htmlFor="command-input">
              <span>&gt;</span>
              <input
                ref={inputRef}
                id="command-input"
                value={word}
                onChange={(event) => setWord(event.target.value)}
                disabled={busy}
                maxLength={40}
                placeholder="type one noun…"
                enterKeyHint="go"
              />
            </label>
            <button type="submit" disabled={busy || !word.trim()}>SUBMIT</button>
            <small>Complete the sentence with one noun.</small>
          </form>
        ) : (
          <button type="button" onClick={action}>{buttonLabel}</button>
        )}
      </section>

      <button className="image-window-button" type="button" onClick={openImageWindow}>
        {imageWindowRef.current && !imageWindowRef.current.closed ? "FOCUS IMAGE VIEW" : "OPEN IMAGE VIEW"}
      </button>
    </main>
  );
}

export default App;
