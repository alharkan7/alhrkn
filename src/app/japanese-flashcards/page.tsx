"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import charactersList from './characters_list.json';

// Define the structure of our flash card data
interface FlashCard {
  "type": "Hiragana" | "Katakana",
  "japanese": string,
  "alphabet": string
}

// Sample data (replace this with your actual JSON data)
const flashCardsData: Record<string, FlashCard> = Object.fromEntries(
  Object.entries(charactersList).map(([key, value]) => [
    key,
    {
      ...value,
      type: value.type as "Hiragana" | "Katakana",
    },
  ])
);

export default function Component() {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [cardState, setCardState] = useState<
    "default" | "correct" | "incorrect"
  >("default");
  const [selectedType, setSelectedType] = useState<"Hiragana" | "Katakana">(
    "Hiragana"
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Initialize cards with all data
    const allCards = Object.values(flashCardsData);
    setCards(allCards);
  }, []);

  useEffect(() => {
    // Filter cards based on selected type
    const filteredCards = Object.values(flashCardsData).filter(
      (card) => card.type === selectedType
    );
    setCards(filteredCards);
    setCurrentCardIndex(0);
    resetCardState();
  }, [selectedType]);

  const handleCheck = () => {
    if (
      userInput.toLowerCase() === cards[currentCardIndex].alphabet.toLowerCase()
    ) {
      setCardState("correct");
    } else {
      setCardState("incorrect");
    }
    setIsFlipped(true);
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
    const animationClass = isFlipped ? "flip-out" : "flip-in";
    cardRef.current?.classList.add(animationClass);

    // Remove the animation class after the animation duration
    setTimeout(() => {
      cardRef.current?.classList.remove(animationClass);
    }, 600); // Match this duration with your CSS animation duration

    if (isFlipped) {
      setCardState("default");
      setUserInput("");
    }
  };

  const [cardPosition, setCardPosition] = useState(0); // New state for card position

  const [shownIndices, setShownIndices] = useState<number[]>([]); // New state to track shown indices

  const handleNextCard = () => {
    setCardPosition(-20); // Move card up
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * cards.length);
      setShownIndices((prev) => [...prev, randomIndex]); // Store shown index
      setCurrentCardIndex(randomIndex);
      setIsFlipped(false);
      setCardState("default");
      setCardPosition(0); // Reset position after animation
    }, 300); // Match this duration with your CSS transition duration
  };

  const handlePreviousCard = () => {
    setCardPosition(20); // Move card down
    setTimeout(() => {
      const previousIndex = shownIndices.pop(); // Get the last shown index
      if (previousIndex !== undefined) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        setCurrentCardIndex(randomIndex);
        setShownIndices(shownIndices); // Update shown indices
      }
      setIsFlipped(false);
      setCardState("default");
      setCardPosition(0); // Reset position after animation
    }, 300); // Match this duration with your CSS transition duration
  };

  const resetCardState = () => {
    setIsFlipped(false);
    setCardState("default");
    setUserInput("");
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let startY: number;
    const threshold = 50; // minimum distance to be considered a swipe

    const touchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const touchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const diffY = startY - endY;

      if (diffY > threshold) {
        handleNextCard();
      } else if (diffY < -threshold) {
        handlePreviousCard();
      }
    };

    card.addEventListener("touchstart", touchStart);
    card.addEventListener("touchend", touchEnd);

    return () => {
      card.removeEventListener("touchstart", touchStart);
      card.removeEventListener("touchend", touchEnd);
    };
  }, []);

  if (cards.length === 0) return <div>Loading...</div>;

  const currentCard = cards[currentCardIndex];

  let touchStartY: number;

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartY = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const touchEndY = event.changedTouches[0].clientY;
    const swipeDistance = touchStartY - touchEndY;

    if (swipeDistance > 50) {
      handleNextCard(); // Swipe Up
    } else if (swipeDistance < -50) {
      handlePreviousCard(); // Swipe Down
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
      <div className="w-full flex justify-center space-x-2 mb-6">
        <Button
          variant={selectedType === "Hiragana" ? "default" : "outline"}
          onClick={() => setSelectedType("Hiragana")}
          className={`rounded-full font-bold ${selectedType === "Hiragana" ? "text-white" : "text-gray-800"
            }`}
        >
          Hiragana
        </Button>
        <Button
          variant={selectedType === "Katakana" ? "default" : "outline"}
          onClick={() => setSelectedType("Katakana")}
          className={`rounded-full font-bold ${selectedType === "Katakana" ? "text-white" : "text-gray-800"
            }`}
        >
          Katakana
        </Button>
      </div>
      <div className="relative w-full max-w-sm">
        <Card
          ref={cardRef}
          style={{ transform: `translateY(${cardPosition}%)` }}
          className={`w-full aspect-square flex flex-col items-center justify-between text-8xl font-bold cursor-pointer transition-all duration-300 ${isFlipped ? "rotate-y-180" : ""
            } ${cardState === "correct"
              ? "bg-green-100"
              : cardState === "incorrect"
                ? "bg-red-100"
                : ""
            }`}
          onClick={handleCardClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handlePreviousCard();
            }}
            className="p-2 hover:bg-gray-100/50"
          >
            <ChevronUp className="h-6 w-6 text-gray-800" />
          </Button>

          <div className={`${isFlipped ? "hidden" : ""}`}>
            {currentCard.japanese}
          </div>
          <div className={`${isFlipped ? "" : "hidden"} rotate-y-180`}>
            {currentCard.alphabet}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleNextCard();
            }}
            className="p-2 hover:bg-gray-100/50"
          >
            <ChevronDown className="h-6 w-6 text-gray-800" />
          </Button>
        </Card>
      </div>
      <div className="w-full max-w-sm mt-6">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Enter alphabet"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCheck();
              }
            }}
            className="flex-grow text-black rounded-full"
          />
          <Button
            onClick={handleCheck}
            size="icon"
            className="rounded-full w-10 h-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-2 text-center text-gray-600 text-xs bg-background">
        Created by {"  "}
        <a href="https://x.com/alhrkn" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          @alhrkn
        </a>
        {"  |  "}
        <button onClick={() => setIsOpen(true)} className="text-gray-500 hover:underline">
          How to Use
        </button>

        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="md:max-w-md w-10/12 bg-white rounded-lg p-4">
              <div className="flex justify-end">
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800">
                  &times;
                </button>
              </div>
              <h2 className="text-lg font-bold mb-2">How to Use this Flashcard</h2>
              <p className="text-gray-600 text-s mb-2">
                <b>Swipe</b> up and down arrow to change card randomly.<br />
                <b>Tap</b> on the card to flip it over and see the alphabet.<br />
                <b>Write</b> in the input field guess the alphabet.<br />
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
