public class Vererbung {
    static class Fahrzeug {
        public void fahren() {
            System.out.println("Das Fahrzeug fährt.");
        }
    }

    static class Auto extends Fahrzeug {
        public void hupen() {
            System.out.println("Das Auto hupt.");
        }
    }

    public static void main(String[] args) {
        Auto auto = new Auto();
        auto.fahren();
        auto.hupen();
    }
}
