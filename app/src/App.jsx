import { DevAuthProvider } from "./lib/mockAuth";
import AppShell from "./components/AppShell";
import OnlineClassroomPage from "./features/onlineClassroom/pages/OnlineClassroomPage";

export default function App() {
  return (
    <DevAuthProvider>
      <AppShell>
        <OnlineClassroomPage />
      </AppShell>
    </DevAuthProvider>
  );
}
