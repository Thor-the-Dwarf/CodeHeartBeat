public class AssertionsBeispiel {
    public static int addiere(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        int erwartet = 7;
        int tatsaechlich = addiere(3, 4);

        if (erwartet != tatsaechlich) {
            throw new AssertionError("Erwartet: " + erwartet + ", tatsächlich: " + tatsaechlich);
        }
        System.out.println("Test erfolgreich.");
    }
}
