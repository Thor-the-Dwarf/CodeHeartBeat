public class MethodenÜberschreibung {
    static class Tier {
        public void lautGeben() {
            System.out.println("Das Tier macht ein Geräusch.");
        }
    }

    static class Hund extends Tier {
        @Override
        public void lautGeben() {
            System.out.println("Der Hund bellt.");
        }
    }

    public static void main(String[] args) {
        Tier tier = new Hund();
        tier.lautGeben();
    }
}
