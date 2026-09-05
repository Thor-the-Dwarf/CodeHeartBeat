public class Kapselung {
    static class Bankkonto {
        private double saldo;

        public void einzahlen(double betrag) {
            if (betrag > 0) {
                this.saldo += betrag;
            }
        }

        public double getSaldo() {
            return this.saldo;
        }
    }

    public static void main(String[] args) {
        Bankkonto konto = new Bankkonto();
        konto.einzahlen(75.50);
        System.out.println("Kontostand: " + konto.getSaldo() + " Euro");
    }
}
