public class UnveraenderlichesObjekt {
    static final class Benutzer {
        private final String name;

        public Benutzer(String name) {
            this.name = name;
        }

        public String getName() {
            return this.name;
        }
    }

    public static void main(String[] args) {
        Benutzer benutzer = new Benutzer("Ada");
        System.out.println("Unveränderlich: " + benutzer.getName());
    }
}
