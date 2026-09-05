import java.util.Objects;

public class ObjectMethoden {
    static class Produkt {
        private final int id;
        private final String name;

        public Produkt(int id, String name) {
            this.id = id;
            this.name = name;
        }

        @Override
        public String toString() {
            return this.id + ": " + this.name;
        }

        @Override
        public boolean equals(Object objekt) {
            if (!(objekt instanceof Produkt)) {
                return false;
            }
            Produkt anderesProdukt = (Produkt) objekt;
            return this.id == anderesProdukt.id;
        }

        @Override
        public int hashCode() {
            return Objects.hash(this.id);
        }
    }

    public static void main(String[] args) {
        Produkt produkt = new Produkt(7, "Tastatur");
        System.out.println(produkt.toString());
    }
}
