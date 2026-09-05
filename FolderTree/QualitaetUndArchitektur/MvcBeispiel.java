public class MvcBeispiel {
    static class Modell {
        private String nachricht = "Hallo MVC";

        public String getNachricht() {
            return this.nachricht;
        }
    }

    static class Ansicht {
        public void anzeigen(String text) {
            System.out.println("Ansicht: " + text);
        }
    }

    static class Controller {
        private final Modell modell;
        private final Ansicht ansicht;

        public Controller(Modell modell, Ansicht ansicht) {
            this.modell = modell;
            this.ansicht = ansicht;
        }

        public void aktualisieren() {
            this.ansicht.anzeigen(this.modell.getNachricht());
        }
    }

    public static void main(String[] args) {
        Controller controller = new Controller(new Modell(), new Ansicht());
        controller.aktualisieren();
    }
}
