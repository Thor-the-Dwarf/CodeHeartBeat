public class AbstrakteKlassen {
    static abstract class Form {
        public abstract double berechneFlaeche();

        public void beschreiben() {
            System.out.println("Ich bin eine geometrische Form.");
        }
    }

    static class Kreis extends Form {
        private final double radius;

        public Kreis(double radius) {
            super();
            this.radius = radius;
        }

        @Override
        public double berechneFlaeche() {
            return Math.PI * this.radius * this.radius;
        }
    }

    public static void main(String[] args) {
        Form form = new Kreis(3.0);
        form.beschreiben();
        System.out.println("Fläche: " + form.berechneFlaeche());
    }
}
