public class VariablenScope {
    public static void main(String[] args) {
        int aussen = 10;

        if (aussen > 5) {
            int innen = 20;
            System.out.println("Innen: " + innen);
            System.out.println("Außen erreichbar: " + aussen);
        }

        System.out.println("Außen: " + aussen);
    }
}
