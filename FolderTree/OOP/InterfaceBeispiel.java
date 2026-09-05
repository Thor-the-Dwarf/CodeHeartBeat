public class InterfaceBeispiel {
    interface Druckbar {
        void drucken();
    }

    static class Rechnung implements Druckbar {
        @Override
        public void drucken() {
            System.out.println("Rechnung wird gedruckt.");
        }
    }
}
