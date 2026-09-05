public class Komposition {
    static class Motor {
        public void starten() {
            System.out.println("Motor gestartet.");
        }
    }

    static class Auto {
        private final Motor motor = new Motor();

        public void starten() {
            this.motor.starten();
            System.out.println("Auto ist fahrbereit.");
        }
    }

    public static void main(String[] args) {
        Auto auto = new Auto();
        auto.starten();
    }
}
