public class StrategieMuster {
    interface RabattStrategie {
        double berechne(double preis);
    }

    static class StandardRabatt implements RabattStrategie {
        public double berechne(double preis) {
            return preis * 0.9;
        }
    }

    static class Warenkorb {
        private final RabattStrategie strategie;

        public Warenkorb(RabattStrategie strategie) {
            this.strategie = strategie;
        }

        public double endpreis(double preis) {
            return this.strategie.berechne(preis);
        }
    }

    public static void main(String[] args) {
        Warenkorb warenkorb = new Warenkorb(new StandardRabatt());
        double endpreis = warenkorb.endpreis(100.0);
        System.out.println("Rabatt korrekt angewendet: " + (endpreis == 90.0));
    }
}
