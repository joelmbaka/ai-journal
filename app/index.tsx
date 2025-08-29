import { JournalScreen } from "../src/screens/JournalScreen";
import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SlideInView } from "../src/components/SlideInView";
import { useTabTransition } from "../src/context/TabTransitionContext";

export default function Index() {
  const { setCurrentByRouteName } = useTabTransition();
  useFocusEffect(
    useCallback(() => {
      setCurrentByRouteName('index');
    }, [setCurrentByRouteName])
  );
  return (
    <SlideInView>
      <JournalScreen />
    </SlideInView>
  );
}
