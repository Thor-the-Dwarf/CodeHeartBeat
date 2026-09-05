import java.util.Scanner;

public class ScannerEingabe {
    public static void main(String[] args) {
        Scanner scanner = new Scanner("Ada\n21");

        String name = scanner.nextLine();
        int alter = scanner.nextInt();

        System.out.println("Name: " + name);
        System.out.println("Alter: " + alter);
        scanner.close();
    }
}
