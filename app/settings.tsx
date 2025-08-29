import { CustomizationScreen } from "../src/screens/CustomizationScreen";
import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SlideInView } from "../src/components/SlideInView";
import { useTabTransition } from "../src/context/TabTransitionContext";

export default function Settings() {
  const { setCurrentByRouteName } = useTabTransition();
  useFocusEffect(
    useCallback(() => {
      setCurrentByRouteName('settings');
    }, [setCurrentByRouteName])
  );
  return (
    <SlideInView>
      <CustomizationScreen />
    </SlideInView>
  );
}
