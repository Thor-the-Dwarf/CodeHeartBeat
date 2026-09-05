public class Rekursion {
    public static int fakultaet(int zahl) {
        if (zahl <= 1) {
            return 1;
        }
        return zahl * fakultaet(zahl - 1);
    }

    public static void main(String[] args) {
        System.out.println("5! = " + fakultaet(5));
    }
}
