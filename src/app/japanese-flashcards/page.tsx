"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronUp, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import charactersList from './characters_list.json';
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'

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

export default function JapaneseFlashcardsPage() {
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
  // Remove isOpen state as Popover handles this internally
  // const [isOpen, setIsOpen] = useState(false);
  const [hasTapped, setHasTapped] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);

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
    if (userInput.toLowerCase() === cards[currentCardIndex].alphabet.toLowerCase()) {
      setCardState("correct");
      setCorrectCount(prev => prev + 1);
    } else {
      setCardState("incorrect");
      setIncorrectCount(prev => prev + 1);
    }
    setIsFlipped(true);
  };

  const handleCardClick = () => {
    setHasTapped(true);
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
    setHasSwiped(true);
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
    setHasSwiped(true);
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

  if (cards.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="animate-pulse space-y-4 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
        <div className="text-muted-foreground font-medium">Loading Cards...</div>
      </div>
    </div>
  );

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
    <>
      <div className="min-h-screen flex flex-col items-center p-4 bg-background relative">
        <div className="fixed top-0 left-0 right-0 z-50">
          <AppsHeader />
        </div>

        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="w-full">
            <div className="flex justify-center space-x-2 mt-6 mb-10">
              <Button
                variant={selectedType === "Hiragana" ? "default" : "neutral"}
                onClick={() => setSelectedType("Hiragana")}
                className={`rounded-full font-bold ${selectedType === "Hiragana" ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
              >
                Hiragana
              </Button>
              <Button
                variant={selectedType === "Katakana" ? "default" : "neutral"}
                onClick={() => setSelectedType("Katakana")}
                className={`rounded-full font-bold ${selectedType === "Katakana" ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
              >
                Katakana
              </Button>
            </div>
          </div>

          <div className="relative w-full max-w-sm mx-auto">

            <div className="absolute w-full -top-4 flex justify-center">
              <Button
                variant="neutral"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviousCard();
                }}
                className="p-0 z-10 hidden md:flex items-center justify-center w-8 h-8"
              >
                <ChevronUp className="h-5 w-5 text-secondary-foreground/50" />
              </Button>
            </div>

            <Card
              ref={cardRef}
              style={{ transform: `translateY(${cardPosition}%)` }}
              className={`w-full aspect-square flex flex-col items-center justify-center text-9xl font-bold cursor-pointer select-none
            transition-all duration-300
            ${isFlipped ? "rotate-y-180" : ""
                } ${cardState === "correct"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100"
                  : cardState === "incorrect"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100"
                    : ""
                }`}
              onClick={handleCardClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >

              <button
                className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoModal(true);
                }}
              >
                <Info className="h-4 w-4" />
              </button>

              <div className={`${isFlipped ? "hidden" : ""}`}>
                {currentCard.japanese}
              </div>
              <div className={`${isFlipped ? "" : "hidden"} rotate-y-180`}>
                {currentCard.alphabet}
              </div>

              <div className={`absolute bottom-0 left-0 right-0 text-center md:hidden ${(hasTapped && hasSwiped) ? 'hidden' : ''}`}>
                <span className="text-xs text-muted-foreground">Swipe & Tap</span>
              </div>
            </Card>

            <div className="absolute w-full -bottom-4 flex justify-center">
              <Button
                variant="neutral"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextCard();
                }}
                className="p-0 z-10 hidden md:flex items-center justify-center w-8 h-8"
              >
                <ChevronDown className="h-5 w-5 text-secondary-foreground/50" />
              </Button>
            </div>

          </div>

          <div className="w-full max-w-sm mt-6 mx-auto">
            <div className="flex items-center space-x-2 mt-4">
              <Input
                type="text"
                placeholder="Guess the alphabet"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCheck();
                  }
                }}
                className="flex-grow"
              />
              <Button
                onClick={handleCheck}
                size="icon"
                className=""
              >
                <ChevronRight className="" />
              </Button>
            </div>

            <div className="text-center mt-4 text-sm font-medium text-secondary-foreground">
              Correct: {correctCount} <span className="mx-2">|</span> Incorrect: {incorrectCount}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 py-1 px-0 text-center text-gray-600 text-xs bg-background">
          <div className="flex-none">
            <AppsFooter />
          </div>
        </div>

        {showInfoModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => setShowInfoModal(false)}
          >
            <Card 
              className="max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="text-center">How to Use this Flashcard</CardTitle>
                <CardDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><b>Swipe</b> up and down arrow to change card randomly</li>
                    <li><b>Tap</b> on the card to flip it over and see the alphabet</li>
                    <li><b>Write</b> in the input field guess the alphabet</li>
                  </ul>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

      </div>
    </>
  );
}
