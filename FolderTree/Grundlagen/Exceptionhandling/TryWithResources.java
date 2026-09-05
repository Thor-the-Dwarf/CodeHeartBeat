public class TryWithResources {
    static class DemoRessource implements AutoCloseable {
        public void verwenden() {
            System.out.println("Ressource wird verwendet.");
        }

        @Override
        public void close() {
            System.out.println("Ressource wird automatisch geschlossen.");
        }
    }

    public static void demonstrieren() {
        try (DemoRessource ressource = new DemoRessource()) {
            ressource.verwenden();
        }
    }
}
