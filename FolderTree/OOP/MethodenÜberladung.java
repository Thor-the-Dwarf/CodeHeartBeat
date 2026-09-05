public class MethodenÜberladung {
    public static int addiere(int a, int b) {
        return a + b;
    }

    public static double addiere(double a, double b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println("Ganzzahlen: " + addiere(4, 7));
        System.out.println("Kommazahlen: " + addiere(2.5, 1.8));
    }
}
