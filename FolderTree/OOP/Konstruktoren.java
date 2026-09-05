public class Konstruktoren {
    static class Buch {
        private final String titel;
        private final int seiten;

        public Buch(String titel, int seiten) {
            this.titel = titel;
            this.seiten = seiten;
        }

        public void anzeigen() {
            System.out.println(this.titel + " hat " + this.seiten + " Seiten.");
        }
    }

    public static void main(String[] args) {
        Buch buch = new Buch("Java kompakt", 320);
        buch.anzeigen();
    }
}
