public class Polymorphie {
    static class Tier {
        public void lautGeben() {
            System.out.println("Unbekanntes Tiergeräusch");
        }
    }

    static class Katze extends Tier {
        @Override
        public void lautGeben() {
            System.out.println("Miau");
        }
    }

    static class Hund extends Tier {
        @Override
        public void lautGeben() {
            System.out.println("Wuff");
        }
    }

    public static void main(String[] args) {
        Tier erstesTier = new Katze();
        Tier zweitesTier = new Hund();
        erstesTier.lautGeben();
        zweitesTier.lautGeben();
    }
}
